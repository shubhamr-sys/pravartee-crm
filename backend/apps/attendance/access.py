"""
Role-based queryset scoping for attendance records.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from apps.accounts.choices import UserRole
from apps.attendance.models import Attendance

User = get_user_model()


def attendance_for_user(user: User) -> QuerySet[Attendance]:
    """Return attendance records visible to the given user."""
    qs = Attendance.objects.select_related("user")
    if user.is_ceo:
        return qs
    if user.is_sales_head:
        return qs.exclude(user__role=UserRole.CEO)
    return qs.filter(user=user)


def user_can_access_attendance(user: User, record: Attendance) -> bool:
    """Object-level check: may this user access this attendance record?"""
    if user.is_ceo:
        return True
    if user.is_sales_head:
        return record.user.role != UserRole.CEO
    return record.user_id == user.pk


def visible_users_for_attendance(user: User) -> QuerySet[User]:
    """Return users whose attendance the requester may view."""
    base = User.objects.filter(is_active=True)
    if user.is_ceo:
        return base.filter(
            role__in=[UserRole.CEO, UserRole.SALES_HEAD, UserRole.SALESPERSON],
        )
    if user.is_sales_head:
        return base.filter(Q(pk=user.pk) | Q(role=UserRole.SALESPERSON))
    return base.filter(pk=user.pk)
