from django.contrib import admin

from .models import FieldVisit, VisitActivity


@admin.register(FieldVisit)
class FieldVisitAdmin(admin.ModelAdmin):
    list_display = (
        "department_name",
        "contact_person",
        "mobile",
        "user",
        "status",
        "check_in_time",
        "check_out_time",
        "duration_hours",
    )
    list_filter = ("status", "check_in_time")
    search_fields = (
        "department_name",
        "contact_person",
        "mobile",
        "user__username",
        "user__email",
        "purpose",
    )
    readonly_fields = ("created_at", "updated_at", "duration_hours")


@admin.register(VisitActivity)
class VisitActivityAdmin(admin.ModelAdmin):
    list_display = ("activity_type", "visit", "user", "created_at")
    list_filter = ("activity_type",)
    search_fields = ("comments", "visit__department_name")

