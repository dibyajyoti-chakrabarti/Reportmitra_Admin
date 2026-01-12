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

# NEW: Delete user view
class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated, IsRootUser]

    def delete(self, request, userid):
        User = get_user_model()
        
        # Prevent deleting yourself
        if request.user.userid == userid:
            return Response(
                {"error": "Cannot delete your own account"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent deleting root users
        try:
            user = User.objects.get(userid=userid)
            if user.is_root:
                return Response(
                    {"error": "Cannot delete root users"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Delete the user
            user.delete()
            return Response(
                {"message": f"User {userid} deleted successfully"},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

# NEW: List users in department
class ListUsersView(APIView):
    permission_classes = [IsAuthenticated, IsRootUser]

    def get(self, request):
        User = get_user_model()
        # Only show users in the same department, exclude root users and self
        users = User.objects.filter(
            department=request.user.department,
            is_root=False
        ).exclude(userid=request.user.userid).values(
            'userid', 'full_name', 'email', 'department'
        )
        return Response(list(users))

# Optional: view current user
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