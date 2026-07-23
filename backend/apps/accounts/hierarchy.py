"""
CRM org hierarchy — manager (reports-to) relationships and team visibility.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from apps.accounts.choices import UserRole

User = get_user_model()


def visible_team_members_for_user(user: User) -> QuerySet[User]:
    """
    Users whose CRM records (leads, activities, attendance, expenses, etc.)
    the requester may view.
    """
    base = User.objects.filter(is_active=True)
    if user.is_ceo:
        return base.filter(
            role__in=[UserRole.CEO, UserRole.SALES_HEAD, UserRole.SALESPERSON],
        )
    if user.is_sales_head:
        return base.filter(Q(pk=user.pk) | Q(manager=user))
    return base.filter(pk=user.pk)


def validate_manager_for_role(role: str, manager: User | None) -> None:
    """Raise ValueError if manager is invalid for the given role."""
    if role in (UserRole.CEO, UserRole.COMMERCIAL, UserRole.ACCOUNTS):
        if manager is not None:
            raise ValueError("CEO, Commercial, and Accounts users cannot have a manager.")
        return

    if role == UserRole.SALES_HEAD:
        if manager is None:
            raise ValueError("Sales Head must report to a CEO.")
        if manager.role != UserRole.CEO:
            raise ValueError("Sales Head must report to a CEO.")
        return

    if role == UserRole.SALESPERSON:
        if manager is None:
            raise ValueError("Salesperson must report to a Sales Head.")
        if manager.role != UserRole.SALES_HEAD:
            raise ValueError("Salesperson must report to a Sales Head.")
        return

    raise ValueError("Invalid role.")
