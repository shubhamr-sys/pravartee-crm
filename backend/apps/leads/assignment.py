"""
Lead assignment rules by CRM role.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from apps.accounts.choices import UserRole
from apps.accounts.hierarchy import visible_team_members_for_user

User = get_user_model()


def assignable_users_for(user: User) -> QuerySet[User]:
    """Return active users the requester may assign leads to."""
    base = User.objects.filter(is_active=True)
    if user.is_ceo:
        return base.filter(
            role__in=[UserRole.CEO, UserRole.SALES_HEAD, UserRole.SALESPERSON],
        )
    if user.is_sales_head:
        return base.filter(Q(pk=user.pk) | Q(manager=user, role=UserRole.SALESPERSON))
    if user.is_salesperson:
        return base.filter(pk=user.pk)
    return base.none()


def user_can_assign_lead_to(requester: User, assignee: User) -> bool:
    """Return True if requester may assign a lead to assignee."""
    if not assignee.is_active:
        return False
    return assignable_users_for(requester).filter(pk=assignee.pk).exists()
