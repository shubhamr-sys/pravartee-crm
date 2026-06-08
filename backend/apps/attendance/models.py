from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel

from .choices import AttendanceActivityType


class Attendance(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    attendance_date = models.DateField(db_index=True)
    punch_in_time = models.DateTimeField(null=True, blank=True)
    punch_out_time = models.DateTimeField(null=True, blank=True)
    punch_in_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    punch_in_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    punch_out_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    punch_out_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    working_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "attendance"
        ordering = ["-attendance_date", "-punch_in_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "attendance_date"],
                name="unique_attendance_per_user_per_day",
            ),
        ]
        indexes = [
            models.Index(fields=["attendance_date"]),
            models.Index(fields=["user", "attendance_date"]),
        ]

    def __str__(self):
        return f"{self.user} — {self.attendance_date}"


class AttendanceActivity(UUIDModel):
    attendance = models.ForeignKey(
        Attendance,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="attendance_activities",
    )
    activity_type = models.CharField(
        max_length=50,
        choices=AttendanceActivityType.choices,
        db_index=True,
    )
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_activities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["attendance", "created_at"]),
        ]

    def __str__(self):
        return f"{self.activity_type} — {self.attendance_id}"
