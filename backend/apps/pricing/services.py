"""
Pricing request workflow services.
"""
from decimal import Decimal, InvalidOperation

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from apps.accounts.access import user_can_access_lead
from apps.activities.models import ActivityType
from apps.activities.services import log_lead_activity
from apps.leads.models import Lead

from .emails import send_pricing_request_email, send_pricing_response_notification
from .models import (
    PricingRequest,
    PricingRequestStatus,
    PricingResponseLineItem,
    PricingSubmissionMode,
)
from .pdf import generate_quotation_pdf

User = None  # lazy import to avoid circular


def _get_user_model():
    from django.contrib.auth import get_user_model

    return get_user_model()


def create_pricing_request(lead: Lead, user) -> PricingRequest:
    """Create pricing request, log activity, and notify recipients."""
    if not lead.items.exists():
        raise ValueError("Lead must have at least one product line item.")

    if PricingRequest.objects.filter(
        lead=lead,
        status=PricingRequestStatus.PENDING,
    ).exists():
        raise ValueError("A pricing request is already pending for this lead.")

    pricing_request = PricingRequest.objects.create(
        lead=lead,
        token=PricingRequest.generate_token(),
        requested_by=user,
        status=PricingRequestStatus.PENDING,
    )
    log_lead_activity(
        lead,
        user,
        ActivityType.PRICE_REQUESTED,
        comments=f"Pricing request #{str(pricing_request.id)[:8]} created.",
    )
    send_pricing_request_email(pricing_request)
    return pricing_request


def _parse_decimal(value) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError("Invalid unit price.") from exc


@transaction.atomic
def submit_pricing_response(
    pricing_request: PricingRequest,
    *,
    vendor_quote_pdf=None,
    line_items_data: list[dict] | None = None,
    response_remarks: str = "",
) -> PricingRequest:
    """Process public pricing submission (vendor PDF and/or manual line pricing)."""
    if pricing_request.status == PricingRequestStatus.RESPONDED:
        raise ValueError("This pricing request has already been responded to.")

    lead = pricing_request.lead
    has_vendor_pdf = vendor_quote_pdf is not None
    has_manual = bool(line_items_data)

    if not has_vendor_pdf and not has_manual:
        raise ValueError("Upload a vendor quotation PDF or enter manual pricing.")

    if has_vendor_pdf:
        pricing_request.vendor_quote_pdf = vendor_quote_pdf
        pricing_request.submission_mode = PricingSubmissionMode.VENDOR_UPLOAD
        log_lead_activity(
            lead,
            None,
            ActivityType.VENDOR_QUOTE_UPLOADED,
            comments="Vendor quotation PDF uploaded.",
        )

    if has_manual:
        pricing_request.submission_mode = (
            PricingSubmissionMode.MANUAL_PRICING
            if not has_vendor_pdf
            else pricing_request.submission_mode
        )
        lead_item_ids = {str(x) for x in lead.items.values_list("id", flat=True)}
        for row in line_items_data or []:
            lead_item_id = str(row.get("lead_item_id"))
            if lead_item_id not in lead_item_ids:
                raise ValueError("Invalid lead line item.")
            unit_price = _parse_decimal(row.get("unit_price"))
            PricingResponseLineItem.objects.update_or_create(
                pricing_request=pricing_request,
                lead_item_id=lead_item_id,
                defaults={
                    "unit_price": unit_price,
                    "remarks": row.get("remarks", ""),
                },
            )

        pdf_bytes = generate_quotation_pdf(pricing_request)
        filename = f"quotation_{pricing_request.id}.pdf"
        pricing_request.generated_quotation_pdf.save(
            filename,
            ContentFile(pdf_bytes),
            save=False,
        )
        log_lead_activity(
            lead,
            None,
            ActivityType.QUOTATION_GENERATED,
            comments="Quotation PDF generated from manual pricing.",
        )

    pricing_request.response_remarks = response_remarks
    pricing_request.status = PricingRequestStatus.RESPONDED
    pricing_request.responded_at = timezone.now()
    pricing_request.save()

    log_lead_activity(
        lead,
        None,
        ActivityType.PRICING_RESPONSE_RECEIVED,
        comments="Pricing response submitted.",
    )
    send_pricing_response_notification(pricing_request)
    return pricing_request


def get_pricing_metrics(queryset) -> dict:
    """Aggregate pricing metrics for reports."""
    from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F

    total = queryset.count()
    pending = queryset.filter(status=PricingRequestStatus.PENDING).count()
    responded = queryset.filter(status=PricingRequestStatus.RESPONDED).count()

    responded_qs = queryset.filter(
        status=PricingRequestStatus.RESPONDED,
        responded_at__isnull=False,
    )
    avg_seconds = responded_qs.annotate(
        response_time=ExpressionWrapper(
            F("responded_at") - F("requested_at"),
            output_field=DurationField(),
        ),
    ).aggregate(avg=Avg("response_time"))["avg"]

    avg_hours = None
    if avg_seconds is not None:
        avg_hours = round(avg_seconds.total_seconds() / 3600, 1)

    by_status = list(
        queryset.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )

    return {
        "total_pricing_requests": total,
        "pending_pricing_requests": pending,
        "responded_pricing_requests": responded,
        "average_response_time_hours": avg_hours,
        "pricing_requests_by_status": by_status,
    }
