from django.contrib import admin

from .models import Lead, LeadItem, LeadStage, ProductCategory


class LeadItemInline(admin.TabularInline):
    model = LeadItem
    extra = 0
    fields = (
        "category",
        "product",
        "brand",
        "model",
        "quantity",
        "uom",
        "unit_price",
        "total_price",
        "specification",
        "remarks",
    )
    readonly_fields = ("total_price",)


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
    autocomplete_fields = ("assigned_to",)
    date_hierarchy = "created_at"
    inlines = [LeadItemInline]


@admin.register(LeadItem)
class LeadItemAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "lead",
        "category",
        "quantity",
        "unit_price",
        "total_price",
    )
    list_filter = ("category",)
    search_fields = ("product", "brand", "model", "lead__customer_name")
    readonly_fields = ("total_price",)
