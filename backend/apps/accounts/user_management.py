"""
Queryset and guards for CEO User Management (CRM app).

System superusers are excluded — manage them only via Django admin.
"""
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

User = get_user_model()

SYSTEM_ADMIN_MSG = (
    "System administrator accounts cannot be managed from the CRM. "
    "Use Django admin instead."
)


def managed_users_queryset():
    """Users visible and editable through CRM User Management."""
    return User.objects.filter(is_superuser=False).order_by(
        "last_name",
        "first_name",
        "username",
    )


def get_managed_user_or_404(pk):
    """Resolve a user that may be updated via User Management."""
    return get_object_or_404(managed_users_queryset(), pk=pk)


def ensure_user_manageable(user: User) -> None:
    """Raise if the target user is a protected system administrator."""
    if user.is_superuser:
        raise PermissionDenied(SYSTEM_ADMIN_MSG)
