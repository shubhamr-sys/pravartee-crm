from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.permissions import IsAuthenticatedCRMUser, IsCEOOrSalesHead

from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LogoutSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer,
)
from .password_reset_services import request_password_reset, reset_password_with_token

User = get_user_model()


def authenticate_by_email(request, email: str, password: str):
    """
    Authenticate a user by email and password.
    Returns the user instance or None.
    """
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return None

    return authenticate(request=request, username=user.username, password=password)


class LoginView(APIView):
    """
    Authenticate with email and password.
    Returns JWT access/refresh tokens and user profile.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate_by_email(request, email, password)
        if user is None or not user.is_active:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class RefreshTokenView(TokenRefreshView):
    """Exchange a valid refresh token for a new access token (with rotation)."""

    permission_classes = [AllowAny]
    authentication_classes = []


class LogoutView(APIView):
    """Blacklist the refresh token to prevent future use."""

    permission_classes = [IsAuthenticatedCRMUser]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "Logged out successfully"},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    """Return the currently authenticated user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)


class ChangePasswordView(APIView):
    """Allow the authenticated user to change their own password."""

    permission_classes = [IsAuthenticatedCRMUser]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):
    """Send a password reset email (max 3 requests per account)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = request_password_reset(serializer.validated_data["email"])
        if result.get("limit_reached"):
            return Response(
                {"detail": result["message"]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"message": result["message"]}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """Set a new password using a reset token from email."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            reset_password_with_token(data["token"], data["new_password"])
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(
            {"message": "Password reset successfully. You can sign in with your new password."},
            status=status.HTTP_200_OK,
        )


class AssignableUserListView(APIView):
    """List users available for lead assignment (CEO / Sales Head only)."""

    permission_classes = [IsAuthenticatedCRMUser, IsCEOOrSalesHead]

    def get(self, request):
        from apps.leads.assignment import assignable_users_for

        users = assignable_users_for(request.user).order_by(
            "first_name",
            "last_name",
            "username",
        )
        return Response(UserProfileSerializer(users, many=True).data)
