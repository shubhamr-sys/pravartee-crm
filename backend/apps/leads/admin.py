from django.contrib import admin

from .models import Brand, Lead, LeadItem, LeadStage, Product, ProductCategory, ProductModel


class LeadItemInline(admin.TabularInline):
    model = LeadItem
    extra = 0
    fields = (
        "category",
        "product",
        "brand",
        "product_model",
        "quantity",
        "uom",
        "specification",
        "remarks",
    )
    autocomplete_fields = ("product", "brand", "product_model")


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "created_at")
    list_filter = ("category",)
    search_fields = ("name",)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "created_at")
    list_filter = ("product__category",)
    search_fields = ("name", "product__name")


@admin.register(ProductModel)
class ProductModelAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "created_at")
    list_filter = ("brand__product__category",)
    search_fields = ("name", "brand__name")


@admin.register(LeadStage)
class LeadStageAdmin(admin.ModelAdmin):
    list_display = ("name", "sequence", "created_at")
    ordering = ("sequence",)


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = (
        "customer_name",
        "company_name",
        "business_segment",
        "deal_value",
        "stage",
        "assigned_to",
        "next_followup_date",
        "is_active",
    )
    list_filter = ("stage", "category", "business_segment", "is_active")
    search_fields = ("customer_name", "company_name", "contact_person", "phone", "email")
    autocomplete_fields = ("assigned_to",)
    date_hierarchy = "created_at"
    inlines = [LeadItemInline]
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "customer_name",
                    "company_name",
                    "contact_person",
                    "phone",
                    "email",
                    "address",
                    "stage",
                    "category",
                    "assigned_to",
                    "is_active",
                ),
            },
        ),
        (
            "Sales MBR commercial",
            {
                "fields": (
                    "business_segment",
                    "deal_value",
                    "billed_amount",
                    "gross_margin_amount",
                    "expected_close_date",
                    "gut_feeling_percent",
                ),
            },
        ),
        (
            "Lost deal",
            {
                "fields": ("lost_reason", "competitor", "recovery_action"),
            },
        ),
        (
            "Other",
            {
                "fields": (
                    "next_followup_date",
                    "notes",
                    "latitude",
                    "longitude",
                    "record_type",
                ),
            },
        ),
    )


@admin.register(LeadItem)
class LeadItemAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "brand",
        "product_model",
        "lead",
        "category",
        "quantity",
        "uom",
    )
    list_filter = ("category", "uom")
    search_fields = (
        "product__name",
        "brand__name",
        "product_model__name",
        "lead__customer_name",
    )
