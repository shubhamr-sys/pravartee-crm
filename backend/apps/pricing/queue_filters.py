"""
Query filters for the commercial pricing queue.
"""
from datetime import datetime

from django.db.models import Q, QuerySet

from apps.pricing.models import PricingRequest


def apply_pricing_queue_filters(
    qs: QuerySet[PricingRequest],
    *,
    search: str = "",
    assigned_to: str = "",
    requested_on: str = "",
    order: str = "-requested_at",
) -> QuerySet[PricingRequest]:
    if search.strip():
        term = search.strip()
        qs = qs.filter(
            Q(lead__customer_name__icontains=term)
            | Q(lead__company_name__icontains=term)
        )

    if assigned_to.strip():
        qs = qs.filter(lead__assigned_to_id=assigned_to.strip())

    if requested_on.strip():
        try:
            day = datetime.strptime(requested_on.strip(), "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValueError("Invalid requested_on date. Use YYYY-MM-DD.") from exc
        qs = qs.filter(requested_at__date=day)

    if order not in ("requested_at", "-requested_at"):
        order = "-requested_at"
    return qs.order_by(order)
