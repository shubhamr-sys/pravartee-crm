"""
Role-based queryset scoping for attendance records.
"""
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from apps.accounts.hierarchy import visible_team_members_for_user
from apps.attendance.models import Attendance

User = get_user_model()


def attendance_for_user(user: User) -> QuerySet[Attendance]:
    """Return attendance records visible to the given user."""
    qs = Attendance.objects.select_related("user")
    if user.is_ceo:
        return qs
    return qs.filter(user_id__in=visible_team_members_for_user(user).values_list("pk", flat=True))


def user_can_access_attendance(user: User, record: Attendance) -> bool:
    """Object-level check: may this user access this attendance record?"""
    if user.is_ceo:
        return True
    return visible_team_members_for_user(user).filter(pk=record.user_id).exists()


def visible_users_for_attendance(user: User) -> QuerySet[User]:
    """Return users whose attendance the requester may view."""
    return visible_team_members_for_user(user)
