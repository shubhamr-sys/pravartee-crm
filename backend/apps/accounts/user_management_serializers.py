import secrets

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.choices import UserRole

User = get_user_model()


class UserManagementListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "username",
            "role",
            "status",
            "is_active",
            "last_login",
            "created_at",
        ]
        read_only_fields = fields

    def get_name(self, obj) -> str:
        return obj.get_full_name()

    def get_status(self, obj) -> str:
        return "Active" if obj.is_active else "Inactive"


class UserManagementDetailSerializer(UserManagementListSerializer):
    class Meta(UserManagementListSerializer.Meta):
        fields = UserManagementListSerializer.Meta.fields + ["first_name", "last_name"]


class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "username",
            "role",
        ]

    def validate_role(self, value):
        if value not in UserRole.values:
            raise serializers.ValidationError("Invalid role.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        temp_password = secrets.token_urlsafe(10)
        user = User.objects.create_user(
            password=temp_password,
            **validated_data,
        )
        user._temporary_password = temp_password
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "role", "is_active"]

    def validate_role(self, value):
        if value not in UserRole.values:
            raise serializers.ValidationError("Invalid role.")
        return value
