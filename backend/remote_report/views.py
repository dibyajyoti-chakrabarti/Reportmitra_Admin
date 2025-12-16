from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny,IsAuthenticated
from .models import IssueReportRemote
from .serializers import IssueReportSerializer
from rest_framework import status
from django.conf import settings
import boto3
import uuid
from urllib.parse import urlparse, unquote

#To generate Report PDF
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from django.http import HttpResponse
from io import BytesIO




class IssueListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        status = request.GET.get("status")

        issues = IssueReportRemote.objects.filter(
            department=user.department
        )

        if status:
            issues = issues.filter(status=status)

        issues = issues.order_by("-issue_date")

        serializer = IssueReportSerializer(issues, many=True)
        return Response(serializer.data)
    
class IssueDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise NotFound("Issue not found")

        # Department-level access control
        if issue.department != request.user.department:
            raise PermissionDenied("You do not have access to this issue")

        data = IssueReportSerializer(issue).data

        data["image_presigned_url"] = (
            generate_presigned_get(data["image_url"])
            if data.get("image_url")
            else None
        )

        return Response(data)


class IssueStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise ValidationError("Issue not found")

        # Permission
        if issue.department != request.user.department and not request.user.is_root:
            raise PermissionDenied("Access denied")

        if issue.status == "resolved":
            raise ValidationError("Resolved issues cannot be modified")

        new_status = request.data.get("status")

        allowed = ["pending", "in_progress", "escalated"]
        if new_status not in allowed:
            raise ValidationError("Invalid status transition")

        issue.status = new_status
        issue.save(update_fields=["status", "updated_at"])

        return Response(
            {"message": "Status updated", "status": issue.status},
            status=status.HTTP_200_OK
        )
    
class IssueResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise ValidationError("Issue not found")

        # Permission check
        if issue.department != request.user.department and not request.user.is_root:
            raise PermissionDenied("Access denied")

        if issue.status == "resolved":
            raise ValidationError("Issue already resolved")

        completion_key = request.data.get("completion_key")
        if not completion_key:
            raise ValidationError("completion_key is required")

        bucket = getattr(
            settings,
            "REPORT_IMAGES_BUCKET",
            getattr(settings, "AWS_STORAGE_BUCKET_NAME", None),
        )

        if not bucket:
            raise ValidationError("S3 bucket not configured")

        # Construct public S3 URL (store this in DB)
        completion_url = f"https://{bucket}.s3.amazonaws.com/{completion_key}"

        issue.status = "resolved"
        issue.completion_url = completion_url
        issue.save(update_fields=["status", "completion_url", "updated_at"])

        return Response({"message": "Issue resolved successfully"})



def extract_s3_key(value: str) -> str:
    """
    Accepts either:
    - raw S3 key: reports/6/file.jpg
    - full S3 URL (encoded or not)

    Returns:
    - clean S3 object key
    """
    if not value:
        return None

    # Case 1: Already a key
    if not value.startswith("http"):
        return value

    # Case 2: Full S3 URL
    parsed = urlparse(value)

    # Remove leading slash and decode %2F etc
    return unquote(parsed.path.lstrip("/"))


def generate_presigned_get(value, expires_in=300):
    key = extract_s3_key(value)
    if not key:
        return None

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": key,
        },
        ExpiresIn=expires_in,
    )

class IssuePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise NotFound("Issue not found")

        # Department-level access
        if issue.department != request.user.department:
            raise PermissionDenied("Access denied")

        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="Title",
            parent=styles["Heading1"],
            alignment=TA_LEFT,
        )

        label_style = ParagraphStyle(
            name="Label",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            spaceAfter=2,
            fontName="Helvetica-Bold",
        )

        value_style = ParagraphStyle(
            name="Value",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            spaceAfter=10,
        )

        wrapped_style = ParagraphStyle(
            name="Wrapped",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            wordWrap="CJK",  # ⭐ prevents overflow for long strings
        )

        story = []

        # Title
        story.append(Paragraph("Issue Report Summary", title_style))
        story.append(Spacer(1, 20))

        def add_field(label, value):
            story.append(Paragraph(label, label_style))
            story.append(
                Paragraph(value if value else "-", value_style)
            )

        add_field("Tracking ID:", issue.tracking_id)
        add_field("Title:", issue.issue_title)
        add_field("Status:", issue.status)
        add_field("Department:", issue.department)
        add_field("Location:", issue.location)
        add_field(
            "Reported On:",
            issue.issue_date.strftime("%d %b %Y, %I:%M %p"),
        )

        # Description
        story.append(Spacer(1, 10))
        story.append(Paragraph("Description:", label_style))

        story.append(
            Paragraph(
                issue.issue_description.replace("\n", "<br/>"),
                wrapped_style,
            )
        )

        doc.build(story)

        buffer.seek(0)

        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="issue_{issue.tracking_id}.pdf"'
        )
        return response

