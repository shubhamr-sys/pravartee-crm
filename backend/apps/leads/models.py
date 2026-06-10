"""
Lead, pipeline stage, product master data, and lead item models.
"""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel

from .uom import LeadItemUOM


class ProductCategory(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "product_categories"
        verbose_name_plural = "product categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "products"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["category", "name"],
                name="unique_product_per_category",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class Brand(TimeStampedModel):
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="brands",
    )
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "brands"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "name"],
                name="unique_brand_per_product",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.product.name})"


class ProductModel(TimeStampedModel):
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name="models",
    )
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "product_models"
        ordering = ["name"]
        verbose_name = "product model"
        verbose_name_plural = "product models"
        constraints = [
            models.UniqueConstraint(
                fields=["brand", "name"],
                name="unique_model_per_brand",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.brand.name})"


class LeadStage(UUIDModel):
    name = models.CharField(max_length=100, unique=True)
    sequence = models.PositiveIntegerField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lead_stages"
        ordering = ["sequence"]

    def __str__(self):
        return self.name


class LeadRecordType(models.TextChoices):
    LEAD = "LEAD", "Lead"
    VISIT = "VISIT", "Visit"


class Lead(TimeStampedModel):
    customer_name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=255, blank=True)
    record_type = models.CharField(
        max_length=20,
        choices=LeadRecordType.choices,
        default=LeadRecordType.LEAD,
    )
    next_followup_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_leads",
    )
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name="leads",
        null=True,
        blank=True,
    )
    stage = models.ForeignKey(
        LeadStage,
        on_delete=models.PROTECT,
        related_name="leads",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "leads"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["assigned_to"]),
            models.Index(fields=["stage"]),
            models.Index(fields=["category"]),
            models.Index(fields=["next_followup_date"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.customer_name} - {self.company_name or 'N/A'}"


class LeadItem(TimeStampedModel):
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="items",
    )
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name="lead_items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="lead_items",
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name="lead_items",
        null=True,
        blank=True,
    )
    product_model = models.ForeignKey(
        ProductModel,
        on_delete=models.PROTECT,
        related_name="lead_items",
        null=True,
        blank=True,
    )
    quantity = models.PositiveIntegerField(default=1)
    uom = models.CharField(
        max_length=20,
        choices=LeadItemUOM.choices,
        default=LeadItemUOM.NOS,
    )
    specification = models.TextField(blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        db_table = "lead_items"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["lead"]),
            models.Index(fields=["category"]),
            models.Index(fields=["product"]),
            models.Index(fields=["brand"]),
            models.Index(fields=["product_model"]),
        ]

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"
