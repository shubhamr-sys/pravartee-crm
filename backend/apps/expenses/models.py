import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel

from .choices import ExpenseCategory, ExpenseStatus


def expense_receipt_upload_path(instance, filename):
    return f"expenses/{instance.id}/{uuid.uuid4().hex}_{filename}"


class Expense(TimeStampedModel):
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    category = models.CharField(
        max_length=20,
        choices=ExpenseCategory.choices,
        db_index=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField(db_index=True)
    description = models.TextField(blank=True)
    receipt = models.FileField(
        upload_to=expense_receipt_upload_path,
        blank=True,
        max_length=500,
    )
    status = models.CharField(
        max_length=20,
        choices=ExpenseStatus.choices,
        default=ExpenseStatus.PENDING,
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_expenses",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        db_table = "expenses"
        ordering = ["-expense_date", "-created_at"]
        indexes = [
            models.Index(fields=["submitted_by", "expense_date"]),
            models.Index(fields=["status", "expense_date"]),
        ]

    def __str__(self):
        return f"{self.submitted_by} — {self.amount} ({self.expense_date})"
