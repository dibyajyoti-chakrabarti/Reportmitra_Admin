from django.urls import path
from .views import RegisterView, MeView, PresignS3UploadView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .serializers import RegisterSerializer

# We will create a custom TokenObtainPairView only if needed (Simple JWT will use USERNAME_FIELD='userid' automatically).
urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("presign-s3/", PresignS3UploadView.as_view(), name="presign-s3"),
]
