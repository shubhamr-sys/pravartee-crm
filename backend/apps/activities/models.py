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
    FOLLOWUP_SCHEDULED = "FOLLOWUP_SCHEDULED", "Follow-up Scheduled"
    FOLLOWUP_COMPLETED = "FOLLOWUP_COMPLETED", "Follow-up Completed"
    NOTE_ADDED = "NOTE_ADDED", "Note Added"
    LEAD_ASSIGNED = "LEAD_ASSIGNED", "Lead Assigned"
    LEAD_CLOSED_WON = "LEAD_CLOSED_WON", "Lead Closed Won"
    LEAD_CLOSED_LOST = "LEAD_CLOSED_LOST", "Lead Closed Lost"
    PRICE_REQUESTED = "PRICE_REQUESTED", "Price Requested"
    PRICING_RESPONSE_RECEIVED = "PRICING_RESPONSE_RECEIVED", "Pricing Response Received"
    VENDOR_QUOTE_UPLOADED = "VENDOR_QUOTE_UPLOADED", "Vendor Quote Uploaded"
    QUOTATION_GENERATED = "QUOTATION_GENERATED", "Quotation Generated"
    GUT_FEELING_UPDATED = "GUT_FEELING_UPDATED", "Gut Feeling Updated"


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
        verbose_name = "lead activity"
        verbose_name_plural = "lead activities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lead"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        lead_display = str(self.lead) if self.lead_id else "Unknown lead"
        user_display = self.user.username if self.user_id else "System"
        return f"{lead_display} — {user_display} — {self.get_activity_type_display()}"
