from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel

from .choices import VisitActivityType, VisitStatus


class FieldVisit(TimeStampedModel):
    """Standalone check-in/out for client or government department visits."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="field_visits",
    )
    department_name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    designation = models.CharField(max_length=255, blank=True)
    purpose = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=VisitStatus.choices,
        default=VisitStatus.IN_PROGRESS,
        db_index=True,
    )
    check_in_time = models.DateTimeField()
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    check_in_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    check_out_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    check_out_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    duration_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "field_visits"
        ordering = ["-check_in_time"]
        indexes = [
            models.Index(fields=["user", "check_in_time"]),
            models.Index(fields=["status", "check_in_time"]),
        ]

    def __str__(self):
        return f"{self.user} — {self.department_name} ({self.check_in_time:%Y-%m-%d %H:%M})"


class VisitActivity(UUIDModel):
    visit = models.ForeignKey(
        FieldVisit,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="visit_activities",
    )
    activity_type = models.CharField(
        max_length=30,
        choices=VisitActivityType.choices,
        db_index=True,
    )
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "field_visit_activities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["visit", "created_at"]),
        ]

    def __str__(self):
        return f"{self.activity_type} — {self.visit_id}"
