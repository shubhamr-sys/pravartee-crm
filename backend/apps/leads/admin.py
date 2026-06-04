from django.contrib import admin

from .models import Lead, LeadStage, ProductCategory


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)


@admin.register(LeadStage)
class LeadStageAdmin(admin.ModelAdmin):
    list_display = ("name", "sequence", "created_at")
    ordering = ("sequence",)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = (
        "customer_name",
        "company_name",
        "stage",
        "assigned_to",
        "estimated_value",
        "next_followup_date",
        "is_active",
    )
    list_filter = ("stage", "category", "lead_source", "is_active")
    search_fields = ("customer_name", "company_name", "contact_person", "phone", "email")
    raw_id_fields = ("assigned_to",)
    date_hierarchy = "created_at"
