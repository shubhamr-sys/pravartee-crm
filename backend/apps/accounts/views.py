from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.permissions import IsAuthenticatedCRMUser, IsCEOOrSalesHead

from .serializers import LogoutSerializer, UserProfileSerializer

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


class AssignableUserListView(APIView):
    """List active salespersons for lead assignment (CEO / Sales Head only)."""

    permission_classes = [IsAuthenticatedCRMUser, IsCEOOrSalesHead]

    def get(self, request):
        from apps.accounts.choices import UserRole

        users = User.objects.filter(
            is_active=True,
            role=UserRole.SALESPERSON,
        ).order_by("first_name", "last_name", "username")
        return Response(UserProfileSerializer(users, many=True).data)
