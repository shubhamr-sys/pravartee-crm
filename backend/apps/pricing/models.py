"""
Pricing request and response models.
"""
import secrets

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


def pricing_vendor_upload_path(instance, filename):
    return f"pricing/vendor_quotes/{instance.id}/{filename}"


def pricing_quotation_upload_path(instance, filename):
    return f"pricing/quotations/{instance.id}/{filename}"


class PricingRequestStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RESPONDED = "RESPONDED", "Responded"


class PricingSubmissionMode(models.TextChoices):
    VENDOR_UPLOAD = "VENDOR_UPLOAD", "Vendor Upload"
    MANUAL_PRICING = "MANUAL_PRICING", "Manual Pricing"


class PricingRequest(TimeStampedModel):
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.CASCADE,
        related_name="pricing_requests",
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=PricingRequestStatus.choices,
        default=PricingRequestStatus.PENDING,
        db_index=True,
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="pricing_requests_created",
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    submission_mode = models.CharField(
        max_length=20,
        choices=PricingSubmissionMode.choices,
        blank=True,
    )
    response_remarks = models.TextField(blank=True)
    vendor_quote_pdf = models.FileField(
        upload_to=pricing_vendor_upload_path,
        blank=True,
    )
    generated_quotation_pdf = models.FileField(
        upload_to=pricing_quotation_upload_path,
        blank=True,
    )

    class Meta:
        db_table = "pricing_requests"
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["lead"]),
            models.Index(fields=["status", "requested_at"]),
        ]

    def __str__(self):
        return f"PricingRequest {self.lead.customer_name} ({self.status})"

    @classmethod
    def generate_token(cls) -> str:
        return secrets.token_urlsafe(48)


class PricingResponseLineItem(TimeStampedModel):
    pricing_request = models.ForeignKey(
        PricingRequest,
        on_delete=models.CASCADE,
        related_name="line_items",
    )
    lead_item = models.ForeignKey(
        "leads.LeadItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pricing_responses",
    )
    category_name = models.CharField(max_length=255, blank=True)
    product_name = models.CharField(max_length=255, blank=True)
    brand_name = models.CharField(max_length=255, blank=True)
    model_name = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(null=True, blank=True)
    specification = models.TextField(blank=True)
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    remarks = models.TextField(blank=True)

    class Meta:
        db_table = "pricing_response_line_items"
        ordering = ["lead_item__created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["pricing_request", "lead_item"],
                name="unique_pricing_line_per_request",
            ),
        ]

    def __str__(self):
        return f"{self.lead_item} @ {self.unit_price}"
