"""
Shared attendance helpers for status, formatting, and map links.
"""
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from apps.attendance.models import Attendance


class AttendanceStatus:
    PRESENT = "Present"
    IN_PROGRESS = "In Progress"
    INCOMPLETE = "Incomplete"
    ABSENT = "Absent"


def get_record_status(
    record: "Attendance | None",
    reference_date: date | None = None,
) -> str:
    """Return attendance status considering same-day vs past incomplete records."""
    reference_date = reference_date or timezone.localdate()
    if not record or not record.punch_in_time:
        return AttendanceStatus.ABSENT
    if not record.punch_out_time:
        attendance_date = getattr(record, "attendance_date", None)
        if attendance_date is not None and attendance_date < reference_date:
            return AttendanceStatus.INCOMPLETE
        return AttendanceStatus.IN_PROGRESS
    return AttendanceStatus.PRESENT


def format_working_hours_display(hours: Decimal | float | str | None) -> str:
    """Format decimal hours as human-readable duration (e.g. 8h 30m)."""
    if hours is None or hours == "":
        return "—"
    total_minutes = int(round(float(hours) * 60))
    hour_part, minute_part = divmod(total_minutes, 60)
    return f"{hour_part}h {minute_part}m"


def get_maps_url(
    latitude: Decimal | float | str | None,
    longitude: Decimal | float | str | None,
) -> str | None:
    """Build a Google Maps URL for GPS coordinates."""
    if latitude is None or longitude is None or latitude == "" or longitude == "":
        return None
    lat = float(latitude)
    lng = float(longitude)
    return f"https://maps.google.com/?q={lat},{lng}"
