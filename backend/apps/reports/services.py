"""
Sales MBR (Monthly Business Review) aggregation logic.

Metric contract
---------------
Period (selected calendar month):
  - leads created in month
  - deals won / lost in month
  - won product quantity / avg products per won deal
  - completed follow-ups
  - pricing requests created in month
  - salesperson won / lost / follow-ups completed

Snapshot (current state, still respecting assignee/category filters):
  - open pipeline lead count and product quantity
  - pipeline by stage
  - category / product mix in open pipeline
  - top open projects
  - today's / overdue follow-ups
  - salesperson leads managed / pipeline qty
"""
from datetime import datetime

from django.contrib.auth import get_user_model
from django.db.models import Count, Prefetch, Sum
from django.utils import timezone

from apps.accounts.access import leads_for_user
from apps.accounts.hierarchy import visible_team_members_for_user
from apps.activities.models import ActivityType, LeadActivity
from apps.leads.categories import PRODUCT_CATEGORIES
from apps.leads.followup_services import (
    get_followup_report_metrics,
    get_salesperson_followups_completed,
)
from apps.leads.models import LeadItem, ProductCategory
from apps.leads.product_metrics import get_product_report_metrics
from apps.pricing.access import pricing_requests_for_user
from apps.pricing.services import get_pricing_metrics
from apps.reports.sales_pack import build_sales_pack_sections
from apps.leads.stages import (
    ALL_STAGES_ORDER,
    LOST_STAGE,
    WON_STAGE,
    active_pipeline_leads,
)

User = get_user_model()


def get_period_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    """Return timezone-aware [start, end) bounds for a calendar month."""
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime(year, month, 1, 0, 0, 0), tz)
    if month == 12:
        end = timezone.make_aware(datetime(year + 1, 1, 1, 0, 0, 0), tz)
    else:
        end = timezone.make_aware(datetime(year, month + 1, 1, 0, 0, 0), tz)
    return start, end


def scoped_leads(
    user: User,
    salesperson_id: str | None = None,
    category_id: str | None = None,
):
    """Role-scoped active leads, optionally filtered to one assignee or category."""
    qs = leads_for_user(user).filter(is_active=True).select_related(
        "assigned_to",
        "stage",
        "category",
    )
    if salesperson_id:
        qs = qs.filter(assigned_to_id=salesperson_id)
    if category_id:
        qs = qs.filter(category_id=category_id)
    return qs


def _assignee_display_name(user: User) -> str:
    """Human-readable assignee label for report filters."""
    name = user.get_full_name() or user.username
    if user.is_ceo:
        return f"{name} (CEO)"
    if user.is_sales_head:
        return f"{name} (Sales Head)"
    return name


def filterable_salespeople(user: User):
    """Users available in the report assignee filter (visible team only)."""
    return visible_team_members_for_user(user).order_by("first_name", "last_name")


def filterable_categories():
    """Categories available in the report category filter."""
    return ProductCategory.objects.filter(name__in=PRODUCT_CATEGORIES).order_by("name")


def validate_report_scope(
    user: User,
    salesperson_id: str | None,
    category_id: str | None,
) -> None:
    """Raise ValueError if assignee/category filters are outside the user's scope."""
    if salesperson_id:
        allowed_ids = {
            str(member.id) for member in filterable_salespeople(user)
        }
        if salesperson_id not in allowed_ids:
            raise ValueError("Assignee is not in your team.")
    if category_id:
        if not filterable_categories().filter(pk=category_id).exists():
            raise ValueError("Invalid category.")


def _won_lost_lead_ids(
    leads_qs,
    activity_type: str,
    start: datetime,
    end: datetime,
) -> set:
    lead_ids = set(leads_qs.values_list("id", flat=True))
    from_activities = set(
        LeadActivity.objects.filter(
            lead_id__in=lead_ids,
            activity_type=activity_type,
            created_at__gte=start,
            created_at__lt=end,
        ).values_list("lead_id", flat=True)
    )
    stage_name = WON_STAGE if activity_type == ActivityType.LEAD_CLOSED_WON else LOST_STAGE
    from_stage = set(
        leads_qs.filter(
            stage__name=stage_name,
            updated_at__gte=start,
            updated_at__lt=end,
        ).values_list("id", flat=True)
    )
    return from_activities | from_stage


def _win_rate(won: int, lost: int) -> float:
    closed = won + lost
    return round((won / closed) * 100, 1) if closed else 0.0


def _pipeline_with_percentages(leads) -> list[dict]:
    total = leads.count()
    stage_rows = (
        leads.values("stage__name", "stage__sequence")
        .annotate(count=Count("id"))
        .order_by("stage__sequence")
    )
    stage_map: dict[str, int] = {
        row["stage__name"]: row["count"] for row in stage_rows
    }
    result = []
    for name in ALL_STAGES_ORDER:
        count = stage_map.get(name, 0)
        percentage = round((count / total) * 100, 1) if total else 0.0
        result.append(
            {
                "stage": name,
                "count": count,
                "percentage": percentage,
            }
        )
    return result


def _category_analysis(leads) -> list[dict]:
    open_pipeline = active_pipeline_leads(leads)
    total_pipeline = open_pipeline.count()
    rows = []
    for category_name in PRODUCT_CATEGORIES:
        category_leads = leads.filter(category__name=category_name)
        lead_count = category_leads.count()
        product_quantity = int(
            LeadItem.objects.filter(lead__in=active_pipeline_leads(category_leads)).aggregate(
                total=Sum("quantity"),
            )["total"]
            or 0,
        )
        pipeline_share = (
            round(
                (
                    active_pipeline_leads(category_leads).count()
                    / total_pipeline
                )
                * 100,
                1,
            )
            if total_pipeline
            else 0.0
        )
        rows.append(
            {
                "category": category_name,
                "lead_count": lead_count,
                "product_quantity": product_quantity,
                "pipeline_share_percentage": pipeline_share,
            }
        )
    return rows


def _top_products_analysis(leads, limit: int = 10) -> list[dict]:
    items = LeadItem.objects.filter(lead__in=leads)
    rows = (
        items.values("product__name")
        .annotate(
            quantity=Sum("quantity"),
            lead_count=Count("lead", distinct=True),
        )
        .order_by("-quantity")[:limit]
    )
    return [
        {
            "product": row["product__name"],
            "quantity": int(row["quantity"] or 0),
            "lead_count": row["lead_count"],
        }
        for row in rows
    ]


def get_sales_mbr_report(
    user: User,
    year: int,
    month: int,
    salesperson_id: str | None = None,
    category_id: str | None = None,
) -> dict:
    """Build the Sales MBR JSON payload."""
    validate_report_scope(user, salesperson_id, category_id)
    start, end = get_period_bounds(year, month)
    leads = scoped_leads(user, salesperson_id, category_id)

    # --- Period metrics ---
    period_leads = leads.filter(created_at__gte=start, created_at__lt=end)
    total_leads = period_leads.count()

    won_ids = _won_lost_lead_ids(leads, ActivityType.LEAD_CLOSED_WON, start, end)
    lost_ids = _won_lost_lead_ids(leads, ActivityType.LEAD_CLOSED_LOST, start, end)
    won_deals = len(won_ids)
    lost_deals = len(lost_ids)
    win_rate = _win_rate(won_deals, lost_deals)

    won_leads = leads.filter(id__in=won_ids) if won_ids else leads.none()
    won_product_quantity = int(
        LeadItem.objects.filter(lead__in=won_leads).aggregate(
            total=Sum("quantity"),
        )["total"]
        or 0,
    )
    average_products_per_won_deal = (
        round(won_product_quantity / won_deals, 1) if won_deals else 0.0
    )

    # --- Snapshot metrics ---
    open_pipeline = active_pipeline_leads(leads)
    active_pipeline_leads_count = open_pipeline.count()
    pipeline_product_quantity = int(
        LeadItem.objects.filter(lead__in=open_pipeline).aggregate(
            total=Sum("quantity"),
        )["total"]
        or 0,
    )

    pipeline_by_stage = _pipeline_with_percentages(leads)
    category_analysis = _category_analysis(leads)
    top_products = _top_products_analysis(open_pipeline)

    top_customers_qs = open_pipeline.order_by("-updated_at")[:10]
    top_customers = [
        {
            "lead_id": str(lead.id),
            "customer": lead.customer_name,
            "company": lead.company_name or "—",
            "product_quantity": int(
                sum(item.quantity for item in lead.items.all()),
            ),
            "stage": lead.stage.name,
        }
        for lead in top_customers_qs.prefetch_related(
            Prefetch("items", queryset=LeadItem.objects.only("lead_id", "quantity")),
        )
    ]

    salesperson_rows = []
    if user.is_ceo or user.is_sales_head:
        assignee_ids = (
            leads.exclude(assigned_to__isnull=True)
            .values_list("assigned_to_id", flat=True)
            .distinct()
        )
        assignees = User.objects.filter(id__in=assignee_ids).order_by(
            "first_name",
            "last_name",
        )
        for assignee in assignees:
            user_leads = leads.filter(assigned_to=assignee)
            user_won_ids = _won_lost_lead_ids(
                user_leads,
                ActivityType.LEAD_CLOSED_WON,
                start,
                end,
            )
            user_lost_ids = _won_lost_lead_ids(
                user_leads,
                ActivityType.LEAD_CLOSED_LOST,
                start,
                end,
            )
            user_won = len(user_won_ids)
            user_lost = len(user_lost_ids)
            user_open = active_pipeline_leads(user_leads)
            user_pipeline_quantity = int(
                LeadItem.objects.filter(lead__in=user_open).aggregate(
                    total=Sum("quantity"),
                )["total"]
                or 0,
            )
            followups_completed = get_salesperson_followups_completed(
                user,
                assignee,
                start,
                end,
            )
            salesperson_rows.append(
                {
                    "user_id": str(assignee.id),
                    "user": assignee.get_full_name() or assignee.username,
                    "assigned_leads": user_leads.count(),
                    "leads_managed": user_leads.count(),
                    "won_deals": user_won,
                    "lost_deals": user_lost,
                    "pipeline_product_quantity": user_pipeline_quantity,
                    "conversion_rate": _win_rate(user_won, user_lost),
                    "win_rate": _win_rate(user_won, user_lost),
                    "followups_completed": followups_completed,
                }
            )

    follow_up_analysis = get_followup_report_metrics(user, start, end, leads)

    pricing_qs = pricing_requests_for_user(user).filter(
        requested_at__gte=start,
        requested_at__lt=end,
    )
    if salesperson_id:
        pricing_qs = pricing_qs.filter(lead__assigned_to_id=salesperson_id)
    if category_id:
        pricing_qs = pricing_qs.filter(lead__category_id=category_id)
    pricing_analysis = get_pricing_metrics(pricing_qs)

    month_name = datetime(year, month, 1).strftime("%B")
    products = get_product_report_metrics(
        user,
        leads_qs=leads,
        won_lead_ids=won_ids,
    )
    sales_pack = build_sales_pack_sections(
        leads,
        won_ids=won_ids,
        lost_ids=lost_ids,
        year=year,
        month=month,
    )

    return {
        "filters": {
            "year": year,
            "month": month,
            "month_name": month_name,
            "salesperson_id": salesperson_id,
            "category_id": category_id,
        },
        "metric_scopes": {
            "period": f"{month_name} {year}",
            "snapshot": "Current open pipeline / live follow-ups",
        },
        "sales_performance": sales_pack["sales_performance"],
        "top_customers_by_revenue": sales_pack["top_customers_by_revenue"],
        "forward_pipeline": sales_pack["forward_pipeline"],
        "lost_deals": sales_pack["lost_deals"],
        "performance_summary": {
            "total_leads": total_leads,
            "active_pipeline_leads": active_pipeline_leads_count,
            "won_deals": won_deals,
            "lost_deals": lost_deals,
            "win_rate": win_rate,
            "pipeline_product_quantity": pipeline_product_quantity,
            "won_product_quantity": won_product_quantity,
            "average_products_per_won_deal": average_products_per_won_deal,
            "order_booking": sales_pack["sales_performance"]["total"]["order_booking"],
            "revenue": sales_pack["sales_performance"]["total"]["revenue"],
            "gross_margin": sales_pack["sales_performance"]["total"]["gross_margin"],
            "gross_margin_pct": sales_pack["sales_performance"]["total"]["gross_margin_pct"],
            "weighted_pipeline": sales_pack["forward_pipeline"]["total_weighted_pipeline"],
        },
        "pipeline_by_stage": pipeline_by_stage,
        "category_analysis": category_analysis,
        "top_products": top_products,
        "top_customers": top_customers,
        "salesperson_performance": salesperson_rows,
        "follow_up_analysis": follow_up_analysis,
        "pricing_analysis": pricing_analysis,
        "salespeople": [
            {
                "id": str(sp.id),
                "name": _assignee_display_name(sp),
            }
            for sp in filterable_salespeople(user)
        ],
        "categories": [
            {"id": str(cat.id), "name": cat.name}
            for cat in filterable_categories()
        ],
        "products": products,
    }


def parse_report_filters(request) -> tuple[int, int, str | None, str | None]:
    """Parse and validate query params for report endpoints."""
    today = timezone.localdate()
    try:
        year = int(request.query_params.get("year", today.year))
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid year.") from exc
    try:
        month = int(request.query_params.get("month", today.month))
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid month.") from exc

    if month < 1 or month > 12:
        raise ValueError("Month must be between 1 and 12.")
    if year < 2000 or year > 2100:
        raise ValueError("Year out of range.")

    salesperson_id = request.query_params.get("salesperson") or None
    category_id = request.query_params.get("category") or None
    return year, month, salesperson_id, category_id
