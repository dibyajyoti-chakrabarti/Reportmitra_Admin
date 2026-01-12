from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import IssueReportRemote
from .serializers import IssueReportSerializer
from rest_framework import status
from django.conf import settings
import boto3
from urllib.parse import urlparse, unquote
from django.utils import timezone
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from django.http import HttpResponse
from io import BytesIO
import requests
import os

#To generate Report PDF
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
)

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
        else:
            issues = issues.filter(status__in = ["pending","in_progress"])

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

        data["completion_presigned_url"] = (
            generate_presigned_get(data["completion_url"])
            if data.get("completion_url")
            else None
        )


        return Response(data)


class IssueStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, tracking_id):
        issue = get_object_or_404(IssueReportRemote, tracking_id=tracking_id)
        new_status = request.data.get("status")

        if new_status not in ["pending", "in_progress", "escalated", "resolved"]:
            return Response(
                {"detail": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current = issue.status

        # ---- STATE MACHINE ----
        if current == "pending":
            if new_status != "in_progress":
                return Response(
                    {"detail": "Pending can only move to In Progress"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            issue.allocated_to = str(request.user.userid)

        elif current == "in_progress":
            if new_status not in ["escalated", "resolved"]:
                return Response(
                    {"detail": "In Progress can only move to Escalated or Resolved"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        elif current in ["escalated", "resolved"]:
            return Response(
                {"detail": f"{current} issues cannot change status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        issue.status = new_status
        issue.updated_at = timezone.now()
        issue.save()

        return Response(
            {"status": issue.status, "allocated_to": issue.allocated_to}
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

        

        # 🔒 Server-authoritative resolution
        issue.status = "resolved"
        issue.completion_url = completion_key
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
    HEADER_HEIGHT = 60
    header_y = PAGE_HEIGHT - HEADER_HEIGHT

    # Header background
    canvas.setFillColor(colors.black)
    canvas.rect(0, header_y, PAGE_WIDTH, HEADER_HEIGHT, stroke=0, fill=1)

    canvas.setFillColor(colors.white)

    # ── Left: Logo + Brand ─────────────────────────
    assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")
    logo_path = os.path.join(assets_path, "logo-1.png")

    try:
        canvas.drawImage(
            logo_path,
            40,
            header_y + 15,
            width=30,
            height=30,
            preserveAspectRatio=True,
            mask="auto",
        )
    except Exception:
        pass

    canvas.setFont("Helvetica-Bold", 16)
    canvas.drawString(80, header_y + 30, "ReportMitra")

    canvas.setFont("Helvetica", 9)
    canvas.drawString(80, header_y + 16, "CIVIC | CONNECT | RESOLVE")

    # ── Right: Document Type ───────────────────────
    canvas.setFont("Helvetica-Bold", 11)
    text = "Issue Field Briefing Report"
    text_width = canvas.stringWidth(text, "Helvetica-Bold", 11)

    canvas.drawString(
        PAGE_WIDTH - text_width - 40,
        header_y + 26,
        text,
    )

    # ── Footer ─────────────────────────────────────
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
            topMargin=80,
            bottomMargin=60,
        )

        styles = getSampleStyleSheet()

        # ── Custom Styles ─────────────────────────────
        title_style = ParagraphStyle(
            "Title",
            fontSize=18,
            fontName="Helvetica-Bold",
            spaceAfter=14,
        )

        subtitle_style = ParagraphStyle(
            "Subtitle",
            fontSize=10,
            textColor=colors.grey,
            spaceAfter=20,
        )

        section_header = ParagraphStyle(
            "SectionHeader",
            fontSize=12,
            fontName="Helvetica-Bold",
            spaceBefore=20,
            spaceAfter=8,
        )

        label = ParagraphStyle(
            "Label",
            fontSize=9,
            fontName="Helvetica-Bold",
        )

        value = ParagraphStyle(
            "Value",
            fontSize=9,
        )

        wrapped = ParagraphStyle(
            "Wrapped",
            fontSize=10,
            leading=14,
            wordWrap="CJK",
        )

        story = []

        # ── Title & Purpose ───────────────────────────
        # story.append(Paragraph("Issue Field Briefing Report", title_style))
        story.append(
            Paragraph(
                "This document is generated to assist on-site municipal workers "
                "with issue verification, safety assessment, and resolution.",
                subtitle_style,
            )
        )

        # ── Status Color ──────────────────────────────
        status_color = {
            "pending": HexColor("#6B7280"),
            "in_progress": HexColor("#D97706"),
            "escalated": HexColor("#B91C1C"),
            "resolved": HexColor("#15803D"),
        }.get(issue.status, colors.black)

        # ── Metadata Table ────────────────────────────
        meta_table = Table(
            [
                ["Tracking ID", issue.tracking_id],
                ["Status", issue.status.upper()],
                ["Department", issue.department],
                ["Location", issue.location],
                [
                    "Reported On",
                    issue.issue_date.strftime("%d %b %Y, %I:%M %p"),
                ],
            ],
            colWidths=[120, 350],
        )

        meta_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                    ("TEXTCOLOR", (1, 1), (1, 1), status_color),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONT", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONT", (1, 0), (1, -1), "Helvetica"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )

        story.append(meta_table)

        # ── Issue Title ───────────────────────────────
        story.append(Spacer(1, 20))
        story.append(Paragraph("Issue Title", section_header))
        story.append(Paragraph(issue.issue_title, wrapped))

        # ── Description ───────────────────────────────
        story.append(Paragraph("Issue Description", section_header))
        desc_box = Table(
            [[Paragraph(issue.issue_description.replace("\n", "<br/>"), wrapped)]],
            colWidths=[470],
        )
        desc_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F9FAFB")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("PADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(desc_box)

        # ── Image Section ─────────────────────────────
        story.append(Paragraph("Issue Image (On-site Reference)", section_header))

        if issue.image_url:
            try:
                presigned_url = generate_presigned_get(issue.image_url)
                img_resp = requests.get(presigned_url, timeout=5)
                img_resp.raise_for_status()

                img = Image(
                    BytesIO(img_resp.content),
                    width=4.5 * inch,
                    height=3 * inch,
                    kind="proportional",
                )

                img_table = Table([[img]], colWidths=[470])
                img_table.setStyle(
                    TableStyle(
                        [
                            ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("PADDING", (0, 0), (-1, -1), 6),
                        ]
                    )
                )

                story.append(img_table)
            except Exception:
                story.append(Paragraph("Image unavailable.", styles["Italic"]))

        # ── Allocation Box ────────────────────────────
        story.append(Paragraph("Allocated To (Fill on-site)", section_header))

        allocation_box = Table(
            [[" "], [" "]],
            colWidths=[470],
            rowHeights=[20, 20],
        )
        allocation_box.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.7, colors.black),
                ]
            )
        )
        story.append(allocation_box)

        # ── QR Code ───────────────────────────────────
        story.append(Paragraph("Quick Access (Admin Reference)", section_header))

        qr_url = f"https://reportmitra.in/admin/issues/{issue.tracking_id}"
        qr_code = qr.QrCodeWidget(qr_url)
        bounds = qr_code.getBounds()
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        d = Drawing(80, 80, transform=[80.0 / width, 0, 0, 80.0 / height, 0, 0])
        d.add(qr_code)

        story.append(d)
        story.append(
            Paragraph(
                "Scan to view issue details on ReportMitra Admin Portal.",
                styles["Italic"],
            )
        )

        # ── Authenticity ──────────────────────────────
        story.append(Spacer(1, 30))
        story.append(
            Paragraph(
                "<b>Verified by ReportMitra - Admin Side</b><br/>"
                "Official municipal record generated digitally.",
                styles["Normal"],
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
