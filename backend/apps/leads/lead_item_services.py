"""
Lead item calculations and lead value synchronization.
"""
from decimal import Decimal

from apps.leads.models import Lead, LeadItem


def calculate_line_total(quantity: int, unit_price) -> Decimal:
    return (Decimal(quantity) * Decimal(unit_price)).quantize(Decimal("0.01"))


def sync_lead_from_items(lead: Lead) -> None:
    """Recalculate lead estimated_value and primary category from line items."""
    items = list(lead.items.select_related("category").order_by("created_at"))
    if not items:
        return

    lead.estimated_value = sum((item.total_price for item in items), Decimal("0.00"))
    lead.category = items[0].category
    lead.save(update_fields=["estimated_value", "category", "updated_at"])


def replace_lead_items(lead: Lead, items_data: list[dict]) -> list[LeadItem]:
    """Replace all items on a lead and sync totals."""
    lead.items.all().delete()
    created: list[LeadItem] = []
    for item_data in items_data:
        created.append(LeadItem.objects.create(lead=lead, **item_data))
    sync_lead_from_items(lead)
    return created
