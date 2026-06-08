"""
Product-level analytics from lead line items.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum

from apps.accounts.access import leads_for_user
from apps.leads.models import LeadItem
from apps.leads.stages import WON_STAGE, active_pipeline_leads

User = get_user_model()


def _decimal(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _items_for_leads(leads_qs):
    return LeadItem.objects.filter(lead__in=leads_qs).select_related(
        "category",
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
    item_pipeline_value = items.aggregate(total=Sum("total_price"))["total"] or 0
    legacy_pipeline_value = (
        pipeline_leads.annotate(item_count=Count("items"))
        .filter(item_count=0)
        .aggregate(total=Sum("estimated_value"))["total"]
        or 0
    )
    pipeline_value = Decimal(item_pipeline_value) + Decimal(legacy_pipeline_value)

    top_products = list(
        items.values("product")
        .annotate(
            quantity=Sum("quantity"),
            revenue=Sum("total_price"),
        )
        .order_by("-revenue")[:5],
    )

    category_revenue = list(
        items.values("category__name")
        .annotate(revenue=Sum("total_price"), quantity=Sum("quantity"))
        .order_by("-revenue"),
    )

    return {
        "pipeline_value": _decimal(pipeline_value),
        "total_product_quantity": int(total_quantity),
        "top_products": [
            {
                "product": row["product"],
                "quantity": int(row["quantity"] or 0),
                "revenue": _decimal(row["revenue"]),
            }
            for row in top_products
        ],
        "category_revenue": [
            {
                "category": row["category__name"],
                "revenue": _decimal(row["revenue"]),
                "quantity": int(row["quantity"] or 0),
            }
            for row in category_revenue
        ],
    }


def get_product_report_metrics(user: User) -> dict:
    """Product analytics for management reports (pipeline + won revenue)."""
    active_leads = leads_for_user(user).filter(is_active=True)
    pipeline_items = _items_for_leads(active_pipeline_leads(active_leads))
    won_items = _items_for_leads(active_leads.filter(stage__name=WON_STAGE))
    all_items = _items_for_leads(active_leads)

    def aggregate_rows(qs, limit=None):
        rows = (
            qs.values("product", "category__name", "brand")
            .annotate(
                quantity=Sum("quantity"),
                revenue=Sum("total_price"),
            )
            .order_by("-revenue")
        )
        if limit:
            rows = rows[:limit]
        return [
            {
                "product": row["product"],
                "category": row["category__name"],
                "brand": row["brand"] or "—",
                "quantity": int(row["quantity"] or 0),
                "revenue": _decimal(row["revenue"]),
            }
            for row in rows
        ]

    quantity_by_product = sorted(
        aggregate_rows(all_items),
        key=lambda row: row["quantity"],
        reverse=True,
    )

    revenue_by_product = aggregate_rows(all_items)

    revenue_by_category = list(
        all_items.values("category__name")
        .annotate(revenue=Sum("total_price"), quantity=Sum("quantity"))
        .order_by("-revenue"),
    )

    revenue_by_brand = list(
        all_items.exclude(brand="")
        .values("brand")
        .annotate(revenue=Sum("total_price"), quantity=Sum("quantity"))
        .order_by("-revenue"),
    )

    top_selling_products = aggregate_rows(won_items, limit=10)

    return {
        "quantity_by_product": quantity_by_product,
        "revenue_by_product": revenue_by_product,
        "revenue_by_category": [
            {
                "category": row["category__name"],
                "revenue": _decimal(row["revenue"]),
                "quantity": int(row["quantity"] or 0),
            }
            for row in revenue_by_category
        ],
        "revenue_by_brand": [
            {
                "brand": row["brand"],
                "revenue": _decimal(row["revenue"]),
                "quantity": int(row["quantity"] or 0),
            }
            for row in revenue_by_brand
        ],
        "top_selling_products": top_selling_products,
        "pipeline_product_quantity": int(
            pipeline_items.aggregate(total=Sum("quantity"))["total"] or 0,
        ),
        "won_product_revenue": _decimal(
            won_items.aggregate(total=Sum("total_price"))["total"],
        ),
    }
