from rest_framework import generics, status
from rest_framework.response import Response
from .serializers import RegisterSerializer, UserSerializer
from .permissions import IsRootUser
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.conf import settings
import boto3
import uuid
import os

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated, IsRootUser]

    def perform_create(self, serializer):
        serializer.save(
            is_root=False,
            department=self.request.user.department
        )

    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated, IsRootUser]

# Optional: view current user
from rest_framework.views import APIView
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        return Response(UserSerializer(user).data)
class PresignS3UploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_name = request.data.get("fileName")
        content_type = request.data.get("contentType")

        if not file_name or not content_type:
            raise ValidationError("fileName and contentType are required")

        # Generate safe, unique S3 key
        ext = os.path.splitext(file_name)[1]
        key = f"completion/{request.user.department}/{uuid.uuid4()}{ext}"

        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )

        try:
            url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=300,  # 5 minutes
            )
        except Exception as e:
            raise ValidationError(str(e))

        return Response(
            {
                "url": url,
                "key": key,
            }
        )
