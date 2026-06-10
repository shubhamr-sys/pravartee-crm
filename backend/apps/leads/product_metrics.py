"""
Product-level analytics from lead line items (quantity-based).
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum

from apps.accounts.access import leads_for_user
from apps.leads.models import LeadItem
from apps.leads.stages import WON_STAGE, active_pipeline_leads

User = get_user_model()


def _items_for_leads(leads_qs):
    return LeadItem.objects.filter(lead__in=leads_qs).select_related(
        "category",
        "product",
        "brand",
        "product_model",
        "lead",
        "lead__stage",
    )


def get_pipeline_product_metrics(user: User) -> dict:
    """Dashboard metrics for active pipeline products."""
    pipeline_leads = active_pipeline_leads(
        leads_for_user(user).filter(is_active=True),
    )
    items = _items_for_leads(pipeline_leads)

    total_quantity = items.aggregate(total=Sum("quantity"))["total"] or 0

    top_products = list(
        items.values("product__name")
        .annotate(quantity=Sum("quantity"))
        .order_by("-quantity")[:5],
    )

    category_quantity = list(
        items.values("category__name")
        .annotate(quantity=Sum("quantity"))
        .order_by("-quantity"),
    )

    return {
        "total_product_quantity": int(total_quantity),
        "top_products": [
            {
                "product": row["product__name"],
                "quantity": int(row["quantity"] or 0),
            }
            for row in top_products
        ],
        "category_quantity": [
            {
                "category": row["category__name"],
                "quantity": int(row["quantity"] or 0),
            }
            for row in category_quantity
        ],
    }


def get_product_report_metrics(user: User) -> dict:
    """Product analytics for management reports (quantity-based)."""
    active_leads = leads_for_user(user).filter(is_active=True)
    pipeline_items = _items_for_leads(active_pipeline_leads(active_leads))
    won_items = _items_for_leads(active_leads.filter(stage__name=WON_STAGE))
    all_items = _items_for_leads(active_leads)

    def aggregate_rows(qs, limit=None):
        rows = (
            qs.values(
                "product__name",
                "category__name",
                "brand__name",
            )
            .annotate(quantity=Sum("quantity"))
            .order_by("-quantity")
        )
        if limit:
            rows = rows[:limit]
        return [
            {
                "product": row["product__name"],
                "category": row["category__name"],
                "brand": row["brand__name"] or "—",
                "quantity": int(row["quantity"] or 0),
            }
            for row in rows
        ]

    quantity_by_product = aggregate_rows(all_items)

    quantity_by_category = list(
        all_items.values("category__name")
        .annotate(quantity=Sum("quantity"))
        .order_by("-quantity"),
    )

    quantity_by_brand = list(
        all_items.exclude(brand__name="")
        .values("brand__name")
        .annotate(quantity=Sum("quantity"))
        .order_by("-quantity"),
    )

    top_selling_products = aggregate_rows(won_items, limit=10)

    return {
        "quantity_by_product": quantity_by_product,
        "quantity_by_category": [
            {
                "category": row["category__name"],
                "quantity": int(row["quantity"] or 0),
            }
            for row in quantity_by_category
        ],
        "quantity_by_brand": [
            {
                "brand": row["brand__name"],
                "quantity": int(row["quantity"] or 0),
            }
            for row in quantity_by_brand
        ],
        "top_selling_products": top_selling_products,
        "pipeline_product_quantity": int(
            pipeline_items.aggregate(total=Sum("quantity"))["total"] or 0,
        ),
        "won_product_quantity": int(
            won_items.aggregate(total=Sum("quantity"))["total"] or 0,
        ),
    }
