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
import uuid
from urllib.parse import urlparse, unquote


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

        serializer = IssueReportSerializer(issue)
        return Response(serializer.data)

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