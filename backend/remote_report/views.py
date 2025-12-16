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
from django.utils import timezone

#To generate Report PDF
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import inch
from reportlab.lib import colors
from django.http import HttpResponse
from io import BytesIO
import requests
import os





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

        # Department / root permission
        if issue.department != request.user.department and not request.user.is_root:
            raise PermissionDenied("Access denied")

        if issue.status == "resolved":
            raise ValidationError("Issue already resolved")

        completion_key = request.data.get("completion_key")
        if not completion_key:
            raise ValidationError("completion_key is required")

        bucket = settings.AWS_STORAGE_BUCKET_NAME
        if not bucket:
            raise ValidationError("S3 bucket not configured")

        completion_url = f"https://{bucket}.s3.amazonaws.com/{completion_key}"

        # 🔒 Server-authoritative resolution
        issue.status = "resolved"
        issue.completion_url = completion_url
        issue.updated_at = timezone.now()

        issue.save(update_fields=["status", "completion_url", "updated_at"])

        return Response(
            {
                "message": "Issue resolved successfully",
                "resolved_by": request.user.full_name,
                "department": request.user.department,
                "resolved_at": issue.updated_at,
            },
            status=status.HTTP_200_OK,
        )



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

def draw_header_footer(canvas, doc):
    canvas.saveState()

    PAGE_WIDTH, PAGE_HEIGHT = A4
    HEADER_HEIGHT = 70

    header_y = PAGE_HEIGHT - HEADER_HEIGHT

    # ── Black header bar ───────────────────
    canvas.setFillColor(colors.black)
    canvas.rect(
        0,
        header_y,
        PAGE_WIDTH,
        HEADER_HEIGHT,
        stroke=0,
        fill=1,
    )

    assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")

    try:
        # Icon logo (vertically centered)
        canvas.drawImage(
            os.path.join(assets_path, "logo-1.png"),
            40,
            header_y + 17,
            width=36,
            height=36,
            mask="auto",
        )

        # Text logo (vertically centered)
        canvas.drawImage(
            os.path.join(assets_path, "logo-2.png"),
            90,
            header_y + 20,
            width=220,
            height=30,
            mask="auto",
        )
    except Exception:
        pass

    # ── Footer ─────────────────────────────
    canvas.setFillColor(colors.black)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(40, 30, f"Page {doc.page}")

    canvas.restoreState()


class IssuePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tracking_id):
        try:
            issue = IssueReportRemote.objects.get(tracking_id=tracking_id)
        except IssueReportRemote.DoesNotExist:
            raise NotFound("Issue not found")

        if issue.department != request.user.department:
            raise PermissionDenied("Access denied")

        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=110,     # leave space for black header
            bottomMargin=50,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="Title",
            parent=styles["Heading1"],
            spaceAfter=20,
        )

        label_style = ParagraphStyle(
            name="Label",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            spaceAfter=2,
        )

        value_style = ParagraphStyle(
            name="Value",
            parent=styles["Normal"],
            fontSize=10,
            spaceAfter=10,
        )

        wrapped_style = ParagraphStyle(
            name="Wrapped",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            wordWrap="CJK",
        )

        story = []

        # ── Title ────────────────────────────
        story.append(Paragraph("Issue Report Summary", title_style))

        def add_field(label, value):
            story.append(Paragraph(label, label_style))
            story.append(Paragraph(value or "-", value_style))

        add_field("Tracking ID:", issue.tracking_id)
        add_field("Title:", issue.issue_title)
        add_field("Status:", issue.status)
        add_field("Department:", issue.department)
        add_field("Location:", issue.location)
        add_field(
            "Reported On:",
            issue.issue_date.strftime("%d %b %Y, %I:%M %p"),
        )

        # ── Description ──────────────────────
        story.append(Spacer(1, 10))
        story.append(Paragraph("Description:", label_style))
        story.append(
            Paragraph(
                issue.issue_description.replace("\n", "<br/>"),
                wrapped_style,
            )
        )

        # ── Issue Image ──────────────────────
        if issue.image_url:
            try:
                story.append(Spacer(1, 20))
                story.append(Paragraph("Issue Image:", label_style))

                presigned_url = generate_presigned_get(issue.image_url)

                img_resp = requests.get(presigned_url, timeout=5)
                img_resp.raise_for_status()

                img_buffer = BytesIO(img_resp.content)

                issue_img = Image(
                    img_buffer,
                    width=4.5 * inch,
                    height=3 * inch,
                    kind="proportional",
                )
                story.append(issue_img)
            except Exception:
                story.append(
                    Paragraph(
                        "Issue image could not be loaded.",
                        styles["Italic"],
                    )
                )

        doc.build(
            story,
            onFirstPage=draw_header_footer,
            onLaterPages=draw_header_footer,
        )

        buffer.seek(0)

        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="issue_{issue.tracking_id}.pdf"'
        )
        return response

