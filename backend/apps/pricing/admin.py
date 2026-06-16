from django.contrib import admin

from .models import PricingRequest, PricingResponseLineItem


class PricingResponseLineItemInline(admin.TabularInline):
    model = PricingResponseLineItem
    extra = 0
    readonly_fields = ("lead_item", "unit_price", "remarks")


@admin.register(PricingRequest)
class PricingRequestAdmin(admin.ModelAdmin):
    list_display = (
        "lead",
        "status",
        "requested_by",
        "requested_at",
        "responded_at",
    )
    list_filter = ("status", "submission_mode")
    search_fields = ("lead__customer_name", "lead__company_name", "token")
    readonly_fields = ("token", "requested_at", "responded_at")
    inlines = [PricingResponseLineItemInline]
