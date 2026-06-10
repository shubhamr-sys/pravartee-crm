import secrets

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCEO
from apps.accounts.user_management import get_managed_user_or_404, managed_users_queryset

from .user_management_serializers import (
    UserCreateSerializer,
    UserManagementDetailSerializer,
    UserManagementListSerializer,
    UserUpdateSerializer,
)

class UserManagementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsCEO]
    pagination_class = None

    def get_queryset(self):
        return managed_users_queryset()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserManagementListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        temp_password = getattr(user, "_temporary_password", None)
        data = UserManagementDetailSerializer(user).data
        data["temporary_password"] = temp_password
        return Response(data, status=status.HTTP_201_CREATED)


class UserManagementDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsCEO]

    def get_queryset(self):
        return managed_users_queryset()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserManagementDetailSerializer


class UserActivateView(APIView):
    permission_classes = [IsCEO]

    def post(self, request, pk):
        user = get_managed_user_or_404(pk)
        user.is_active = True
        user.save(update_fields=["is_active", "updated_at"])
        return Response(UserManagementDetailSerializer(user).data)


class UserDeactivateView(APIView):
    permission_classes = [IsCEO]

    def post(self, request, pk):
        user = get_managed_user_or_404(pk)
        if user.pk == request.user.pk:
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        return Response(UserManagementDetailSerializer(user).data)


class UserResetPasswordView(APIView):
    permission_classes = [IsCEO]

    def post(self, request, pk):
        user = get_managed_user_or_404(pk)
        temp_password = secrets.token_urlsafe(10)
        user.set_password(temp_password)
        user.save(update_fields=["password", "updated_at"])
        return Response(
            {
                "message": "Password reset successfully.",
                "temporary_password": temp_password,
            }
        )
