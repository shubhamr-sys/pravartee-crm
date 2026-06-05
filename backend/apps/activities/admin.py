from django.contrib import admin

from .models import LeadActivity


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ("lead_display", "user_display", "activity_type", "created_at")
    list_filter = ("activity_type",)
    search_fields = (
        "lead__customer_name",
        "lead__company_name",
        "user__username",
        "comments",
    )
    autocomplete_fields = ("lead", "user")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("lead", "user")

    @admin.display(description="Lead", ordering="lead__customer_name")
    def lead_display(self, obj: LeadActivity) -> str:
        return str(obj.lead)

    @admin.display(description="User", ordering="user__username")
    def user_display(self, obj: LeadActivity) -> str:
        return obj.user.username if obj.user_id else "System"
