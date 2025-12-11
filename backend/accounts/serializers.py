from rest_framework import serializers
from .models import User
from django.contrib.auth import get_user_model

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ("id", "userid", "department", "is_root")
        read_only_fields = ("is_root",)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = get_user_model()
        fields = ("userid","password","department","is_root")

    def create(self, validated_data):
        return get_user_model().objects.create_user(
            userid=validated_data["userid"],
            password=validated_data["password"],
            is_root=validated_data.get("is_root", False),
            department=validated_data.get("department","")
        )
