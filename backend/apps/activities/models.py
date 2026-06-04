"""
Lead activity audit trail models.
"""
from django.conf import settings
from django.db import models

from apps.core.models import UUIDModel


class ActivityType(models.TextChoices):
    LEAD_CREATED = "LEAD_CREATED", "Lead Created"
    LEAD_UPDATED = "LEAD_UPDATED", "Lead Updated"
    STAGE_CHANGED = "STAGE_CHANGED", "Stage Changed"
    FOLLOWUP_UPDATED = "FOLLOWUP_UPDATED", "Follow-up Updated"
    NOTE_ADDED = "NOTE_ADDED", "Note Added"
    LEAD_ASSIGNED = "LEAD_ASSIGNED", "Lead Assigned"
    LEAD_CLOSED_WON = "LEAD_CLOSED_WON", "Lead Closed Won"
    LEAD_CLOSED_LOST = "LEAD_CLOSED_LOST", "Lead Closed Lost"


class LeadActivity(UUIDModel):
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.CASCADE,
        related_name="activities",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="lead_activities",
    )
    activity_type = models.CharField(max_length=100, choices=ActivityType.choices)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lead_activities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lead"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.activity_type} — {self.lead_id}"
