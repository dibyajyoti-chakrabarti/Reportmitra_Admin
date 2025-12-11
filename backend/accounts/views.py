from rest_framework import generics, status
from rest_framework.response import Response
from .serializers import RegisterSerializer, UserSerializer
from .permissions import IsRootUser
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

# Register endpoint - only root users can create normal accounts
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated, IsRootUser]

# Optional: view current user
from rest_framework.views import APIView
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        return Response(UserSerializer(user).data)
