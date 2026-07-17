"""
Sales MBR commercial targets and related report models.
"""
from django.db import models

from apps.core.models import TimeStampedModel
from apps.leads.models import BusinessSegment


class SalesMonthlyTarget(TimeStampedModel):
    """Monthly sales targets for MBR performance summary (Trading / Solutions)."""

    year = models.PositiveIntegerField()
    month = models.PositiveSmallIntegerField()
    segment = models.CharField(
        max_length=20,
        choices=BusinessSegment.choices,
    )
    order_booking_target = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )
    revenue_target = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )
    gross_margin_target = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
    )
    deals_won_target = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "sales_monthly_targets"
        ordering = ["-year", "-month", "segment"]
        constraints = [
            models.UniqueConstraint(
                fields=["year", "month", "segment"],
                name="unique_sales_target_per_month_segment",
            ),
            models.CheckConstraint(
                condition=models.Q(month__gte=1, month__lte=12),
                name="sales_target_month_range",
            ),
        ]

    def __str__(self):
        return f"{self.segment} {self.month}/{self.year}"
