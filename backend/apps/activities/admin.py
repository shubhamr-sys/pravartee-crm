from django.contrib import admin

from .models import LeadActivity


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ("lead", "user", "activity_type", "created_at")
    list_filter = ("activity_type",)
    search_fields = ("lead__customer_name", "comments")
    raw_id_fields = ("lead", "user")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
