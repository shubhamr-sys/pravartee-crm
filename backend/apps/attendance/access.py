"""
Role-based queryset scoping for attendance records and corrections.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from apps.accounts.choices import UserRole
from apps.attendance.models import Attendance, AttendanceCorrectionRequest

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


def corrections_for_user(user: User) -> QuerySet[AttendanceCorrectionRequest]:
    """Return correction requests visible to the given user."""
    qs = AttendanceCorrectionRequest.objects.select_related(
        "attendance",
        "attendance__user",
        "requested_by",
        "approved_by",
    )
    if user.is_ceo:
        return qs
    if user.is_sales_head:
        return qs.exclude(
            Q(requested_by__role=UserRole.CEO) | Q(attendance__user__role=UserRole.CEO),
        )
    return qs.filter(requested_by=user)


def user_can_access_correction(
    user: User,
    correction: AttendanceCorrectionRequest,
) -> bool:
    """Object-level check for correction request visibility."""
    if user.is_ceo:
        return True
    if user.is_sales_head:
        return (
            correction.requested_by.role != UserRole.CEO
            and correction.attendance.user.role != UserRole.CEO
        )
    return correction.requested_by_id == user.pk


def user_can_approve_correction(
    user: User,
    correction: AttendanceCorrectionRequest,
) -> bool:
    """Return True if user may approve or reject this correction request."""
    if user.is_salesperson:
        return False
    if correction.status != "PENDING":
        return False
    if user.is_ceo:
        return True
    if user.is_sales_head:
        return (
            correction.requested_by.role != UserRole.CEO
            and correction.attendance.user.role != UserRole.CEO
        )
    return False


def pending_corrections_for_user(user: User) -> QuerySet[AttendanceCorrectionRequest]:
    """Return pending correction requests the user can act on or is notified about."""
    qs = corrections_for_user(user).filter(status="PENDING")
    if user.is_salesperson:
        return qs.filter(requested_by=user)
    return qs
