"""
Lead assignment rules by CRM role.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from apps.accounts.choices import UserRole

User = get_user_model()


def assignable_users_for(user: User) -> QuerySet[User]:
    """Return active users the requester may assign leads to."""
    base = User.objects.filter(is_active=True)
    if user.is_ceo:
        return base.filter(
            role__in=[UserRole.CEO, UserRole.SALES_HEAD, UserRole.SALESPERSON],
        )
    if user.is_sales_head:
        return base.filter(Q(pk=user.pk) | Q(role=UserRole.SALESPERSON))
    if user.is_salesperson:
        return base.filter(pk=user.pk)
    return base.none()


def user_can_assign_lead_to(requester: User, assignee: User) -> bool:
    """Return True if requester may assign a lead to assignee."""
    if not assignee.is_active:
        return False
    if requester.is_ceo:
        return assignee.role in (
            UserRole.CEO,
            UserRole.SALES_HEAD,
            UserRole.SALESPERSON,
        )
    if requester.is_sales_head:
        return assignee.pk == requester.pk or assignee.role == UserRole.SALESPERSON
    if requester.is_salesperson:
        return assignee.pk == requester.pk
    return False
