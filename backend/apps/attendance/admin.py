from django.contrib import admin

from .models import Attendance, AttendanceActivity


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "attendance_date",
        "punch_in_time",
        "punch_out_time",
        "working_hours",
        "created_at",
    ]
    list_filter = ["attendance_date", "user__role", "user"]
    search_fields = [
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "notes",
    ]
    readonly_fields = ["id", "created_at", "updated_at", "working_hours"]
    date_hierarchy = "attendance_date"
    ordering = ["-attendance_date", "-punch_in_time"]


@admin.register(AttendanceActivity)
class AttendanceActivityAdmin(admin.ModelAdmin):
    list_display = ["attendance", "activity_type", "user", "created_at"]
    list_filter = ["activity_type", "created_at"]
    search_fields = ["comments", "old_value", "new_value"]
    readonly_fields = ["id", "created_at"]
    ordering = ["-created_at"]
