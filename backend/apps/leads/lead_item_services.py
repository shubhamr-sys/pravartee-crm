"""
Lead item synchronization with lead header fields.
"""
from apps.leads.models import Lead, LeadItem


def sync_lead_from_items(lead: Lead) -> None:
    """Set lead primary category from the first line item."""
    items = list(
        lead.items.select_related("category").order_by("created_at"),
    )
    if not items:
        return

    lead.category = items[0].category
    lead.save(update_fields=["category", "updated_at"])


def replace_lead_items(lead: Lead, items_data: list[dict]) -> list[LeadItem]:
    """Replace all items on a lead and sync lead category."""
    lead.items.all().delete()
    created: list[LeadItem] = []
    for item_data in items_data:
        created.append(LeadItem.objects.create(lead=lead, **item_data))
    sync_lead_from_items(lead)
    return created
