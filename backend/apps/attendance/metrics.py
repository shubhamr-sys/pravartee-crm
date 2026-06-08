"""
Attendance metrics for dashboard widgets.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Avg
from django.utils import timezone

from apps.attendance.access import attendance_for_user, visible_users_for_attendance
from apps.attendance.models import Attendance
from apps.attendance.utils import format_working_hours_display, get_record_status

User = get_user_model()


def get_attendance_metrics(user: User) -> dict:
    """Return role-scoped attendance dashboard metrics."""
    today = timezone.localdate()
    visible_users = visible_users_for_attendance(user)
    total_employees = visible_users.count()

    today_records = attendance_for_user(user).filter(attendance_date=today)
    punched_in_user_ids = set(
        today_records.filter(punch_in_time__isnull=False).values_list("user_id", flat=True),
    )
    present_today = len(punched_in_user_ids)
    absent_today = total_employees - present_today

    completed_today = today_records.filter(
        punch_in_time__isnull=False,
        punch_out_time__isnull=False,
    )
    avg_hours = completed_today.aggregate(avg=Avg("working_hours"))["avg"]
    average_working_hours = (
        Decimal(str(avg_hours)).quantize(Decimal("0.01")) if avg_hours else Decimal("0.00")
    )

    my_record = Attendance.objects.filter(user=user, attendance_date=today).first()
    my_status = get_record_status(my_record)
    my_working_hours = my_record.working_hours if my_record else None

    if user.is_ceo:
        return {
            "present_today": present_today,
            "absent_today": absent_today,
            "total_employees": total_employees,
            "average_working_hours": average_working_hours,
            "average_working_hours_display": format_working_hours_display(
                average_working_hours,
            ),
        }

    if user.is_sales_head:
        return {
            "team_present": present_today,
            "team_absent": absent_today,
            "team_members": total_employees,
            "average_team_working_hours": average_working_hours,
            "average_team_working_hours_display": format_working_hours_display(
                average_working_hours,
            ),
        }

    return {
        "today_status": my_status,
        "working_hours": my_working_hours,
        "working_hours_display": format_working_hours_display(my_working_hours),
        "punch_in_time": my_record.punch_in_time if my_record else None,
        "punch_out_time": my_record.punch_out_time if my_record else None,
    }
