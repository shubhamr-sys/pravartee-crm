import secrets

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.choices import UserRole
from apps.accounts.hierarchy import validate_manager_for_role

User = get_user_model()


class UserManagementListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    manager_id = serializers.UUIDField(source="manager_id", read_only=True, allow_null=True)
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "username",
            "role",
            "manager_id",
            "manager_name",
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

    def get_manager_name(self, obj) -> str | None:
        if not obj.manager_id:
            return None
        return obj.manager.get_full_name()


class UserManagementDetailSerializer(UserManagementListSerializer):
    class Meta(UserManagementListSerializer.Meta):
        fields = UserManagementListSerializer.Meta.fields + ["first_name", "last_name"]


class UserCreateSerializer(serializers.ModelSerializer):
    manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_superuser=False),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "username",
            "role",
            "manager",
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

    def validate(self, attrs):
        role = attrs.get("role")
        manager = attrs.get("manager")
        try:
            validate_manager_for_role(role, manager)
        except ValueError as exc:
            raise serializers.ValidationError({"manager": str(exc)}) from exc
        return attrs

    def create(self, validated_data):
        temp_password = secrets.token_urlsafe(10)
        user = User.objects.create_user(
            password=temp_password,
            **validated_data,
        )
        user._temporary_password = temp_password
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_superuser=False),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "role", "is_active", "manager"]

    def validate_role(self, value):
        if value not in UserRole.values:
            raise serializers.ValidationError("Invalid role.")
        return value

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", None))
        manager = attrs.get("manager", getattr(self.instance, "manager", None))
        try:
            validate_manager_for_role(role, manager)
        except ValueError as exc:
            raise serializers.ValidationError({"manager": str(exc)}) from exc
        return attrs
