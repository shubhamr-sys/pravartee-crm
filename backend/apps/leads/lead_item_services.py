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
    """Sync lead line items, preserving IDs when provided so pricing links stay intact."""
    keep_ids: set = set()
    result: list[LeadItem] = []

    for raw in items_data:
        data = dict(raw)
        item_id = data.pop("id", None)
        if item_id and LeadItem.objects.filter(pk=item_id, lead=lead).exists():
            item = LeadItem.objects.get(pk=item_id, lead=lead)
            for key, value in data.items():
                setattr(item, key, value)
            item.save()
        else:
            item = LeadItem.objects.create(lead=lead, **data)
        keep_ids.add(item.pk)
        result.append(item)

    lead.items.exclude(pk__in=keep_ids).delete()
    sync_lead_from_items(lead)
    return result
