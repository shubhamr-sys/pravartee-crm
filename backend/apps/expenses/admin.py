from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "expense_date",
        "submitted_by",
        "category",
        "amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "category", "expense_date")
    search_fields = ("description", "submitted_by__username", "submitted_by__email")
    readonly_fields = ("created_at", "updated_at", "reviewed_at")
