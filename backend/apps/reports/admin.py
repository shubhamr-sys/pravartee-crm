from django.contrib import admin

from apps.reports.models import SalesMonthlyTarget


@admin.register(SalesMonthlyTarget)
class SalesMonthlyTargetAdmin(admin.ModelAdmin):
    list_display = (
        "year",
        "month",
        "segment",
        "order_booking_target",
        "revenue_target",
        "gross_margin_target",
        "deals_won_target",
    )
    list_filter = ("year", "month", "segment")
