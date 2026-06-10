"""
Attendance punch-in/out business logic.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.attendance.activity import log_attendance_activity, log_punch_in, log_punch_out
from apps.attendance.choices import AttendanceActivityType
from apps.attendance.models import Attendance

User = get_user_model()


def calculate_working_hours(punch_in_time, punch_out_time) -> Decimal:
    """Return working hours as a decimal rounded to two places."""
    delta = punch_out_time - punch_in_time
    if delta.total_seconds() < 0:
        raise ValidationError("Cannot punch out before punching in.")
    hours = Decimal(str(delta.total_seconds() / 3600))
    return hours.quantize(Decimal("0.01"))


def punch_in(user: User, latitude: float, longitude: float) -> Attendance:
    """Create today's attendance record with punch-in time and GPS."""
    today = timezone.localdate()
    if Attendance.objects.filter(user=user, attendance_date=today).exists():
        raise ValidationError("You have already punched in today.")

    now = timezone.now()
    record = Attendance.objects.create(
        user=user,
        attendance_date=today,
        punch_in_time=now,
        punch_in_latitude=Decimal(str(latitude)),
        punch_in_longitude=Decimal(str(longitude)),
    )
    log_attendance_activity(
        record,
        AttendanceActivityType.ATTENDANCE_CREATED,
        user=user,
        comments=f"Attendance created for {today}.",
    )
    log_punch_in(record, user)
    return record


def punch_out(user: User, latitude: float, longitude: float) -> Attendance:
    """Update today's attendance with punch-out time, GPS, and working hours."""
    today = timezone.localdate()
    try:
        record = Attendance.objects.get(user=user, attendance_date=today)
    except Attendance.DoesNotExist as exc:
        raise ValidationError("You must punch in before punching out.") from exc

    if not record.punch_in_time:
        raise ValidationError("You must punch in before punching out.")

    if record.punch_out_time:
        raise ValidationError("You have already punched out today.")

    now = timezone.now()
    if now < record.punch_in_time:
        raise ValidationError("Cannot punch out before punching in.")

    record.punch_out_time = now
    record.punch_out_latitude = Decimal(str(latitude))
    record.punch_out_longitude = Decimal(str(longitude))
    record.working_hours = calculate_working_hours(record.punch_in_time, now)
    record.save(
        update_fields=[
            "punch_out_time",
            "punch_out_latitude",
            "punch_out_longitude",
            "working_hours",
            "updated_at",
        ],
    )
    log_punch_out(record, user)
    return record
