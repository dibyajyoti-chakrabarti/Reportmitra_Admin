from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ("id", "userid", "full_name", "email", "department", "is_root")
        read_only_fields = ("is_root",)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = get_user_model()
        fields = ("id", "userid", "password", "full_name", "email", "department", "is_root")

    def validate_userid(self, value):
        if get_user_model().objects.filter(userid=value).exists():
            raise serializers.ValidationError("User ID already exists")
        return value


    def create(self, validated_data):
        return get_user_model().objects.create_user(
        userid=validated_data["userid"],
        password=validated_data["password"],
        is_root=validated_data.get("is_root", False),
        department=validated_data.get("department", ""),
        full_name=validated_data.get("full_name", ""),
        email=validated_data.get("email", "")
    )


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("userid", "full_name", "email", "department", "is_root", "is_staff")
