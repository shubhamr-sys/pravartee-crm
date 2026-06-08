"""
Attendance audit trail helpers.
"""
from django.contrib.auth import get_user_model

from apps.attendance.choices import AttendanceActivityType
from apps.attendance.models import Attendance, AttendanceActivity

User = get_user_model()


def log_attendance_activity(
    attendance: Attendance,
    activity_type: str,
    user: User | None = None,
    old_value: str = "",
    new_value: str = "",
    comments: str = "",
) -> AttendanceActivity:
    """Record an attendance timeline event."""
    return AttendanceActivity.objects.create(
        attendance=attendance,
        user=user,
        activity_type=activity_type,
        old_value=old_value,
        new_value=new_value,
        comments=comments,
    )


def log_punch_in(attendance: Attendance, user: User) -> None:
    log_attendance_activity(
        attendance,
        AttendanceActivityType.PUNCH_IN_RECORDED,
        user=user,
        new_value=str(attendance.punch_in_time),
        comments="GPS punch in recorded.",
    )


def log_punch_out(attendance: Attendance, user: User) -> None:
    log_attendance_activity(
        attendance,
        AttendanceActivityType.PUNCH_OUT_RECORDED,
        user=user,
        new_value=str(attendance.punch_out_time),
        comments=f"Working hours: {attendance.working_hours}",
    )
