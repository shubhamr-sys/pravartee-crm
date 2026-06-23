"""
Forgot-password email and token workflow.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from apps.accounts.password_reset_models import (
    MAX_PASSWORD_RESET_EMAILS,
    PasswordResetToken,
)

User = get_user_model()


def _reset_url(token: str) -> str:
    base = settings.FRONTEND_PUBLIC_URL.rstrip("/")
    return f"{base}/reset-password/{token}"


def send_password_reset_email(user, token: str) -> None:
    context = {
        "user": user,
        "reset_url": _reset_url(token),
        "expires_hours": 1,
    }
    subject = "Reset your Pravartee CRM password"
    message = render_to_string("accounts/emails/password_reset.txt", context)
    html_message = render_to_string("accounts/emails/password_reset.html", context)
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )


def request_password_reset(email: str) -> dict:
    """
    Send a password reset email if the account exists and is under the limit.
    Returns a status dict for the API layer.
    """
    generic_message = (
        "If an account exists for this email, password reset instructions have been sent."
    )

    try:
        user = User.objects.get(email__iexact=email.strip())
    except User.DoesNotExist:
        return {"message": generic_message, "sent": False}

    if not user.is_active:
        return {"message": generic_message, "sent": False}

    if user.password_reset_email_count >= MAX_PASSWORD_RESET_EMAILS:
        return {
            "message": (
                "You have reached the maximum of 3 password reset requests for this account. "
                "Please contact your administrator."
            ),
            "sent": False,
            "limit_reached": True,
        }

    reset_token = PasswordResetToken.create_for_user(user)
    send_password_reset_email(user, reset_token.token)

    user.password_reset_email_count += 1
    user.save(update_fields=["password_reset_email_count", "updated_at"])

    return {"message": generic_message, "sent": True}


def reset_password_with_token(token: str, new_password: str) -> User:
    """Validate token and set a new password."""
    try:
        reset_token = PasswordResetToken.objects.select_related("user").get(token=token)
    except PasswordResetToken.DoesNotExist as exc:
        raise ValueError("Invalid or expired reset link.") from exc

    if not reset_token.is_valid:
        raise ValueError("Invalid or expired reset link.")

    user = reset_token.user
    if not user.is_active:
        raise ValueError("This account is inactive.")

    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])

    reset_token.used_at = timezone.now()
    reset_token.save(update_fields=["used_at", "updated_at"])

    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).exclude(
        pk=reset_token.pk,
    ).update(used_at=timezone.now())

    return user
