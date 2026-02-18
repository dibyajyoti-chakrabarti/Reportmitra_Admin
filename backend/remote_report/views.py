from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import IssueReportRemote, CustomUserRemote
from .serializers import IssueReportSerializer
from .services import apply_reject_penalty, adjudicate_appeal, apply_resolve_reward
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
        status_param = request.GET.get("status")
        appeal_status = request.GET.get("appeal_status")
        deactivated_filter = request.GET.get("deactivated")

        # Auto-escalate stale in_progress issues
        self._auto_escalate_stale_issues(user.department)

        issues = IssueReportRemote.objects.filter(
            department=user.department
        )

        if status_param:
            issues = issues.filter(status=status_param)
        else:
            issues = issues.filter(status__in = ["pending","in_progress"])

        if appeal_status:
            issues = issues.filter(appeal_status=appeal_status)

        if deactivated_filter is not None:
            if str(deactivated_filter).lower() == "true":
                reporter_ids = CustomUserRemote.objects.filter(
                    deactivated_until__gt=timezone.now()
                ).values_list("id", flat=True)
                issues = issues.filter(user_id__in=reporter_ids)
            elif str(deactivated_filter).lower() == "false":
                reporter_ids = CustomUserRemote.objects.filter(
                    deactivated_until__gt=timezone.now()
                ).values_list("id", flat=True)
                issues = issues.exclude(user_id__in=reporter_ids)

        issues = issues.order_by("-issue_date")

        serializer = IssueReportSerializer(issues, many=True)
        return Response(serializer.data)
    
    def _auto_escalate_stale_issues(self, department):
        """Auto-escalate in_progress issues not updated for 3 days"""
        three_days_ago = timezone.now() - timedelta(days=3)
        
        stale_issues = IssueReportRemote.objects.filter(
            department=department,
            status="in_progress",
            updated_at__lt=three_days_ago
        )
        
        for issue in stale_issues:
            issue.status = "escalated"
            issue.auto_escalated = True
            issue.updated_at = timezone.now()
            issue.save(update_fields=["status", "auto_escalated", "updated_at"])
    
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

        if issue.department != request.user.department:
            raise PermissionDenied("Access denied")

        new_status = request.data.get("status")

        if new_status not in ["pending", "in_progress", "escalated", "resolved", "rejected"]:
            return Response(
                {"detail": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == "rejected":
            with transaction.atomic():
                locked_issue = IssueReportRemote.objects.select_for_update().get(pk=issue.pk)
                result = apply_reject_penalty(report=locked_issue, admin_user=request.user)

            return Response(
                {
                    "status": locked_issue.status,
                    "appeal_status": locked_issue.appeal_status,
                    "trust_score_delta": locked_issue.trust_score_delta,
                    "user_trust_score": result["user"].trust_score,
                    "user_deactivated_until": result["user"].deactivated_until,
                    "penalty_applied": result["applied"],
                }
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

        elif current in ["escalated", "resolved", "rejected"]:
            return Response(
                {"detail": f"{current} issues cannot change status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == "resolved":
            with transaction.atomic():
                locked_issue = IssueReportRemote.objects.select_for_update().get(pk=issue.pk)
                result = apply_resolve_reward(report=locked_issue, admin_user=request.user)
            return Response(
                {
                    "status": locked_issue.status,
                    "allocated_to": locked_issue.allocated_to,
                    "appeal_status": locked_issue.appeal_status,
                    "trust_score_delta": locked_issue.trust_score_delta,
                    "user_trust_score": result["user"].trust_score,
                    "user_deactivated_until": result["user"].deactivated_until,
                    "reward_applied": result["applied"],
                }
            )

        issue.status = new_status
        issue.updated_at = timezone.now()
        issue.save()

        return Response(
            {
                "status": issue.status,
                "allocated_to": issue.allocated_to,
                "appeal_status": issue.appeal_status,
                "trust_score_delta": issue.trust_score_delta,
                "user_trust_score": CustomUserRemote.objects.filter(id=issue.user_id).values_list("trust_score", flat=True).first(),
                "user_deactivated_until": CustomUserRemote.objects.filter(id=issue.user_id).values_list("deactivated_until", flat=True).first(),
            }
        )


class IssueAppealDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, tracking_id):
        decision = request.data.get("decision")
        issue = get_object_or_404(IssueReportRemote, tracking_id=tracking_id)

        if not request.user.is_root:
            raise PermissionDenied("Root admin access required")

        if issue.department != request.user.department:
            raise PermissionDenied("Access denied")

        try:
            with transaction.atomic():
                locked_issue = IssueReportRemote.objects.select_for_update().get(pk=issue.pk)
                result = adjudicate_appeal(
                    report=locked_issue,
                    decision=decision,
                    admin_user=request.user,
                )
        except ValueError as exc:
            raise ValidationError(str(exc))

        return Response(
            {
                "status": locked_issue.status,
                "appeal_status": locked_issue.appeal_status,
                "trust_score_delta": locked_issue.trust_score_delta,
                "user_trust_score": result["user"].trust_score,
                "user_deactivated_until": result["user"].deactivated_until,
            },
            status=status.HTTP_200_OK,
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

        completion_key = request.data.get("completion_key")
        if not completion_key:
            raise ValidationError("completion_key is required")

        bucket = settings.AWS_STORAGE_BUCKET_NAME
        if not bucket:
            raise ValidationError("S3 bucket not configured")

        

        with transaction.atomic():
            locked_issue = IssueReportRemote.objects.select_for_update().get(pk=issue.pk)
            if locked_issue.status == "resolved":
                raise ValidationError("Issue already resolved")

            result = apply_resolve_reward(report=locked_issue, admin_user=request.user)
            locked_issue.completion_url = completion_key
            locked_issue.updated_at = timezone.now()
            locked_issue.save(update_fields=["completion_url", "updated_at"])

        return Response(
            {
                "message": "Issue resolved successfully",
                "resolved_by": request.user.full_name,
                "department": request.user.department,
                "resolved_at": locked_issue.updated_at,
                "trust_score_delta": locked_issue.trust_score_delta,
                "user_trust_score": result["user"].trust_score,
                "reward_applied": result["applied"],
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
def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=(
            getattr(settings, "AWS_REGION", None)
            or getattr(settings, "AWS_S3_REGION_NAME", None)
            or "ap-south-1"
        ),
    )


def generate_presigned_get(value, expires_in=300):
    key = extract_s3_key(value)
    if not key:
        return None

    bucket_name = (
        getattr(settings, "REPORT_IMAGES_BUCKET", None)
        or getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    )

    if not bucket_name:
        raise RuntimeError("No S3 bucket configured")

    s3 = get_s3_client()

    return s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket_name,
            "Key": key,
        },
        ExpiresIn=expires_in,
    )

def draw_header_footer(canvas, doc):
    canvas.saveState()

    PAGE_WIDTH, PAGE_HEIGHT = A4
    HEADER_HEIGHT = 68
    header_y = PAGE_HEIGHT - HEADER_HEIGHT

    # Header
    canvas.setFillColor(HexColor("#111827"))
    canvas.rect(0, header_y, PAGE_WIDTH, HEADER_HEIGHT, stroke=0, fill=1)

    assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")
    logo_path = os.path.join(assets_path, "logo-1.png")

    try:
        canvas.drawImage(
            logo_path,
            40,
            header_y + 18,
            width=35,
            height=35,
            preserveAspectRatio=True,
            mask="auto",
        )
    except Exception:
        pass

    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 17)
    canvas.drawString(85, header_y + 37, "ReportMitra")

    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(HexColor("#E5E7EB"))
    canvas.drawString(85, header_y + 21, "CIVIC ISSUE RESPONSE PORTAL")

    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 11)
    text = "Issue Dossier"
    text_width = canvas.stringWidth(text, "Helvetica-Bold", 12)
    canvas.drawString(PAGE_WIDTH - text_width - 40, header_y + 30, text)

    # Footer
    canvas.setStrokeColor(HexColor("#E5E7EB"))
    canvas.line(40, 46, PAGE_WIDTH - 40, 46)
    canvas.setFillColor(HexColor("#4B5563"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(40, 34, f"Page {doc.page}")

    footer_text = f"Generated on {timezone.now().strftime('%d %b %Y, %I:%M %p')}"
    footer_width = canvas.stringWidth(footer_text, "Helvetica", 8)
    canvas.drawString(PAGE_WIDTH - footer_width - 40, 34, footer_text)

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
            topMargin=90,
            bottomMargin=65,
        )

        section_header = ParagraphStyle("SectionHeader", fontSize=13, fontName="Helvetica-Bold", textColor=HexColor("#0F172A"), spaceBefore=16, spaceAfter=8)
        body_text = ParagraphStyle("BodyText", fontSize=10, leading=14, textColor=HexColor("#334155"))
        subtitle = ParagraphStyle("Subtitle", fontSize=9, textColor=HexColor("#64748B"), spaceAfter=14, leading=13)
        label_text = ParagraphStyle("LabelText", fontSize=8, fontName="Helvetica-Bold", textColor=HexColor("#64748B"))
        metric_value = ParagraphStyle("MetricValue", fontSize=11, fontName="Helvetica-Bold", textColor=HexColor("#0F172A"))
        small_note = ParagraphStyle("SmallNote", fontSize=8, textColor=HexColor("#64748B"), leading=11)

        story = []

        story.append(
            Paragraph(
                "Operational summary for municipal issue handling, field verification, and audit records.",
                subtitle,
            )
        )

        status_colors = {
            "pending": ("#FEF3C7", "#92400E"),
            "in_progress": ("#DBEAFE", "#1E40AF"),
            "escalated": ("#FEE2E2", "#991B1B"),
            "resolved": ("#D1FAE5", "#065F46"),
        }
        bg_color, text_color = status_colors.get(
            issue.status, ("#F3F4F6", "#1F2937")
        )

        summary_data = [
            [
                Paragraph("TRACKING ID", label_text),
                Paragraph("STATUS", label_text),
                Paragraph("DEPARTMENT", label_text),
            ],
            [
                Paragraph(issue.tracking_id, metric_value),
                Paragraph(
                    f'<para backColor="{bg_color}" textColor="{text_color}" '
                    f'fontName="Helvetica-Bold">&nbsp;{issue.status.replace("_", " ").upper()}&nbsp;</para>',
                    metric_value,
                ),
                Paragraph(issue.department or "-", metric_value),
            ],
        ]
        summary_table = Table(summary_data, colWidths=[165, 160, 160])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.8, HexColor("#CBD5E1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 14))

        story.append(Paragraph("Issue Overview", section_header))

        overview_data = [
            [
                Paragraph("<b>Tracking ID</b>", body_text),
                Paragraph(issue.tracking_id, body_text),
            ],
            [
                Paragraph("<b>Status</b>", body_text),
                Paragraph(
                    f'<para backColor="{bg_color}" textColor="{text_color}" '
                    f'fontSize="9" fontName="Helvetica-Bold">'
                    f'&nbsp;&nbsp;{issue.status.upper()}&nbsp;&nbsp;</para>',
                    body_text,
                ),
            ],
            [
                Paragraph("<b>Department</b>", body_text),
                Paragraph(issue.department, body_text),
            ],
            [
                Paragraph("<b>Location</b>", body_text),
                Paragraph(issue.location, body_text),
            ],
            [
                Paragraph("<b>Reported On</b>", body_text),
                Paragraph(issue.issue_date.strftime("%d %B %Y, %I:%M %p"), body_text),
            ],
            [
                Paragraph("<b>Last Updated</b>", body_text),
                Paragraph(issue.updated_at.strftime("%d %B %Y, %I:%M %p"), body_text),
            ],
            [
                Paragraph("<b>Assigned To</b>", body_text),
                Paragraph(issue.allocated_to or "-", body_text),
            ],
        ]

        overview_table = Table(overview_data, colWidths=[130, 355])
        overview_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), HexColor("#F8FAFC")),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(overview_table)
        story.append(Spacer(1, 16))

        story.append(Paragraph("Issue Title", section_header))
        title_box = Table([[Paragraph(issue.issue_title or "-", body_text)]], colWidths=[485])
        title_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(title_box)

        story.append(Paragraph("Issue Description", section_header))
        desc_box = Table(
            [[Paragraph((issue.issue_description or "-").replace("\n", "<br/>"), body_text)]],
            colWidths=[485],
        )
        desc_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(desc_box)

        story.append(Paragraph("Issue Image", section_header))

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

                img_table = Table([[img]], colWidths=[485])
                img_table.setStyle(
                    TableStyle(
                        [
                            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 10),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                            ("TOPPADDING", (0, 0), (-1, -1), 10),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                        ]
                    )
                )
                story.append(img_table)
            except Exception as e:
                error_box = Table(
                    [[Paragraph("Image unavailable", body_text)]], colWidths=[485]
                )
                error_box.setStyle(
                    TableStyle(
                        [
                            ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 12),
                            ("TOPPADDING", (0, 0), (-1, -1), 20),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
                        ]
                    )
                )
                story.append(error_box)
        else:
            no_img_box = Table(
                [[Paragraph("No image attached", body_text)]], colWidths=[485]
            )
            no_img_box.setStyle(
                TableStyle(
                    [
                        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 12),
                        ("TOPPADDING", (0, 0), (-1, -1), 20),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
                    ]
                )
            )
            story.append(no_img_box)

        story.append(Spacer(1, 14))
        story.append(Paragraph("Quick Access", section_header))

        qr_url = f"https://reportmitra.in/admin/issues/{issue.tracking_id}"
        qr_code = qr.QrCodeWidget(qr_url)
        bounds = qr_code.getBounds()
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        d = Drawing(100, 100, transform=[100.0 / width, 0, 0, 100.0 / height, 0, 0])
        d.add(qr_code)

        qr_table = Table([[d]], colWidths=[485])
        qr_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
                ]
            )
        )
        story.append(qr_table)

        story.append(Spacer(1, 8))
        story.append(
            Paragraph(
                "<i>Scan to open this issue in ReportMitra Admin.</i>",
                ParagraphStyle("QRCaption", fontSize=9, textColor=HexColor("#6B7280"), alignment=1),
            )
        )

        story.append(Spacer(1, 18))
        auth_box = Table(
            [
                [
                    Paragraph(
                        "<b>Official Document</b><br/>"
                        "This is a digitally generated municipal record from the ReportMitra Admin Portal. "
                        "Handle and share only with authorized personnel.",
                        ParagraphStyle("Auth", fontSize=9, textColor=HexColor("#334155"), leading=12),
                    )
                ]
            ],
            colWidths=[485],
        )
        auth_box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F1F5F9")),
                    ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#CBD5E1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(auth_box)
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"Issue URL: {qr_url}", small_note))

        #Build PDF
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
