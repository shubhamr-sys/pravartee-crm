"""
Pricing request email notifications.
"""
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from apps.attendance.utils import get_maps_url
from apps.pricing.models import PricingRequest


def _recipient_list() -> list[str]:
    commercial = getattr(settings, "PRICING_COMMERCIAL_EMAILS", [])
    purchase = getattr(settings, "PRICING_PURCHASE_EMAILS", [])
    return list(dict.fromkeys([*commercial, *purchase]))


def _public_submission_url(token: str) -> str:
    base = settings.FRONTEND_PUBLIC_URL.rstrip("/")
    return f"{base}/pricing-request/{token}"


def _line_rows(pricing_request: PricingRequest) -> list[dict]:
    rows = []
    for item in pricing_request.lead.items.select_related(
        "category",
        "product",
        "brand",
        "product_model",
    ):
        parts = [item.category.name, item.product.name]
        if item.brand_id:
            parts.append(item.brand.name)
        if item.product_model_id:
            parts.append(item.product_model.name)
        rows.append(
            {
                "hierarchy": " → ".join(parts),
                "quantity": item.quantity,
                "specification": item.specification or "—",
                "remarks": item.remarks or "—",
            }
        )
    return rows


def _lead_location_context(lead) -> dict:
    location_url = get_maps_url(lead.latitude, lead.longitude)
    if lead.latitude is not None and lead.longitude is not None:
        gps_coordinates = f"{lead.latitude}, {lead.longitude}"
    else:
        gps_coordinates = None
    return {
        "record_type_display": lead.get_record_type_display(),
        "address": lead.address.strip() if lead.address else None,
        "gps_coordinates": gps_coordinates,
        "location_url": location_url,
    }


def send_pricing_request_email(pricing_request: PricingRequest) -> None:
    recipients = _recipient_list()
    if not recipients:
        return

    lead = pricing_request.lead
    context = {
        "lead": lead,
        "pricing_request": pricing_request,
        "line_rows": _line_rows(pricing_request),
        "submission_url": _public_submission_url(pricing_request.token),
        "requested_by": (
            pricing_request.requested_by.get_full_name()
            if pricing_request.requested_by_id
            else "CRM User"
        ),
        **_lead_location_context(lead),
    }
    subject = f"Pricing Request — {lead.customer_name} ({lead.company_name or 'N/A'})"
    message = render_to_string("pricing/emails/pricing_request.txt", context)
    html_message = render_to_string("pricing/emails/pricing_request.html", context)
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        html_message=html_message,
        fail_silently=False,
    )


def send_pricing_response_notification(pricing_request: PricingRequest) -> None:
    lead = pricing_request.lead
    assignee = lead.assigned_to
    if not assignee or not assignee.email:
        return

    context = {
        "lead": lead,
        "pricing_request": pricing_request,
        "submission_mode": pricing_request.get_submission_mode_display()
        if pricing_request.submission_mode
        else "Submitted",
    }
    subject = f"Pricing Response Received — {lead.customer_name}"
    message = render_to_string("pricing/emails/pricing_response_owner.txt", context)
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[assignee.email],
        fail_silently=False,
    )
