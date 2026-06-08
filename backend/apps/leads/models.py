"""
Lead, pipeline stage, product category, and lead item models.
"""
from decimal import Decimal

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


class LeadStage(UUIDModel):
    name = models.CharField(max_length=100, unique=True)
    sequence = models.PositiveIntegerField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lead_stages"
        ordering = ["sequence"]

    def __str__(self):
        return self.name


class LeadSource(models.TextChoices):
    WEBSITE = "WEBSITE", "Website"
    REFERRAL = "REFERRAL", "Referral"
    TENDER = "TENDER", "Tender"
    WHATSAPP = "WHATSAPP", "WhatsApp"
    EMAIL = "EMAIL", "Email"
    COLD_CALL = "COLD_CALL", "Cold Call"
    EXISTING_CUSTOMER = "EXISTING_CUSTOMER", "Existing Customer"
    WALK_IN = "WALK_IN", "Walk-In"
    OTHER = "OTHER", "Other"


class Lead(TimeStampedModel):
    customer_name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=255, blank=True)
    estimated_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    lead_source = models.CharField(
        max_length=100,
        choices=LeadSource.choices,
        default=LeadSource.OTHER,
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
    product = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True)
    model = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    uom = models.CharField(
        max_length=20,
        choices=LeadItemUOM.choices,
        default=LeadItemUOM.NOS,
    )
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=15, decimal_places=2, default=0)
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
        ]

    def __str__(self):
        return f"{self.product} × {self.quantity}"

    def save(self, *args, **kwargs):
        self.total_price = (
            Decimal(self.quantity) * Decimal(self.unit_price)
        ).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        lead = self.lead
        super().delete(*args, **kwargs)
        from apps.leads.lead_item_services import sync_lead_from_items

        if lead.items.exists():
            sync_lead_from_items(lead)
