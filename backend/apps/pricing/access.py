"""
Role-scoped pricing request querysets.
"""
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from apps.accounts.access import leads_for_user
from apps.pricing.models import PricingRequest

User = get_user_model()


def pricing_requests_for_user(user: User) -> QuerySet[PricingRequest]:
    lead_ids = leads_for_user(user).values_list("id", flat=True)
    return (
        PricingRequest.objects.filter(lead_id__in=lead_ids)
        .select_related("lead", "lead__stage", "lead__assigned_to", "requested_by")
        .prefetch_related(
            "line_items",
            "line_items__lead_item",
            "line_items__lead_item__category",
            "line_items__lead_item__product",
            "line_items__lead_item__brand",
            "line_items__lead_item__product_model",
            "lead__items",
            "lead__items__category",
            "lead__items__product",
            "lead__items__brand",
            "lead__items__product_model",
        )
        .order_by("-requested_at")
    )
