"""
Sales MBR (Monthly Business Review) aggregation logic.
"""
from datetime import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.utils import timezone

from apps.accounts.access import leads_for_user
from apps.accounts.choices import UserRole
from apps.activities.models import ActivityType, LeadActivity
from apps.leads.product_metrics import get_product_report_metrics
from apps.leads.stages import (
    ACTIVE_PIPELINE_STAGES,
    ALL_STAGES_ORDER,
    LOST_STAGE,
    WON_STAGE,
    active_pipeline_leads,
)

User = get_user_model()


def _decimal(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def get_period_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    """Return timezone-aware [start, end) bounds for a calendar month."""
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime(year, month, 1, 0, 0, 0), tz)
    if month == 12:
        end = timezone.make_aware(datetime(year + 1, 1, 1, 0, 0, 0), tz)
    else:
        end = timezone.make_aware(datetime(year, month + 1, 1, 0, 0, 0), tz)
    return start, end


def scoped_leads(user: User, salesperson_id: str | None = None):
    """Role-scoped active leads, optionally filtered to one assignee."""
    qs = leads_for_user(user).filter(is_active=True).select_related(
        "assigned_to",
        "stage",
    )
    if salesperson_id:
        qs = qs.filter(assigned_to_id=salesperson_id)
    return qs


def filterable_salespeople(user: User):
    """Users available in the salesperson filter dropdown."""
    qs = User.objects.filter(is_active=True).order_by("first_name", "last_name")
    if user.is_ceo:
        return qs.filter(role__in=[UserRole.SALES_HEAD, UserRole.SALESPERSON])
    if user.is_sales_head:
        return qs.filter(role=UserRole.SALESPERSON)
    return qs.none()


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


def get_sales_mbr_report(
    user: User,
    year: int,
    month: int,
    salesperson_id: str | None = None,
) -> dict:
    """Build the Sales MBR JSON payload."""
    start, end = get_period_bounds(year, month)
    leads = scoped_leads(user, salesperson_id)

    period_leads = leads.filter(created_at__gte=start, created_at__lt=end)
    total_leads = period_leads.count()
    active_pipeline_leads_count = period_leads.filter(
        stage__name__in=ACTIVE_PIPELINE_STAGES,
    ).count()

    won_ids = _won_lost_lead_ids(leads, ActivityType.LEAD_CLOSED_WON, start, end)
    lost_ids = _won_lost_lead_ids(leads, ActivityType.LEAD_CLOSED_LOST, start, end)
    won_deals = len(won_ids)
    lost_deals = len(lost_ids)
    win_rate = _win_rate(won_deals, lost_deals)

    won_leads = leads.filter(id__in=won_ids) if won_ids else leads.none()
    revenue = _decimal(won_leads.aggregate(total=Sum("estimated_value"))["total"])
    average_deal_size = (
        _decimal(revenue / won_deals) if won_deals else Decimal("0.00")
    )

    open_pipeline = active_pipeline_leads(leads)
    pipeline_value = _decimal(
        open_pipeline.aggregate(total=Sum("estimated_value"))["total"]
    )

    stage_rows = (
        leads.values("stage__name", "stage__sequence")
        .annotate(count=Count("id"), value=Sum("estimated_value"))
        .order_by("stage__sequence")
    )
    stage_map: dict[str, dict] = {}
    for row in stage_rows:
        name = row["stage__name"]
        value = (
            _decimal(row["value"])
            if name in ACTIVE_PIPELINE_STAGES
            else Decimal("0.00")
        )
        stage_map[name] = {
            "stage": name,
            "count": row["count"],
            "value": value,
        }

    pipeline_by_stage = [
        stage_map.get(
            name,
            {"stage": name, "count": 0, "value": Decimal("0.00")},
        )
        for name in ALL_STAGES_ORDER
    ]

    top_customers_qs = open_pipeline.order_by("-estimated_value")[:10]
    top_customers = [
        {
            "customer": lead.customer_name,
            "company": lead.company_name or "—",
            "value": _decimal(lead.estimated_value),
            "stage": lead.stage.name,
        }
        for lead in top_customers_qs
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
            salesperson_rows.append(
                {
                    "user_id": str(assignee.id),
                    "user": assignee.get_full_name() or assignee.username,
                    "leads_managed": user_leads.count(),
                    "won_deals": user_won,
                    "lost_deals": user_lost,
                    "pipeline_value": _decimal(
                        user_open.aggregate(total=Sum("estimated_value"))["total"]
                    ),
                    "conversion_rate": _win_rate(user_won, user_lost),
                    "win_rate": _win_rate(user_won, user_lost),
                }
            )

    month_name = datetime(year, month, 1).strftime("%B")

    return {
        "filters": {
            "year": year,
            "month": month,
            "month_name": month_name,
            "salesperson_id": salesperson_id,
        },
        "performance_summary": {
            "total_leads": total_leads,
            "active_pipeline_leads": active_pipeline_leads_count,
            "qualified_leads": active_pipeline_leads_count,
            "won_deals": won_deals,
            "lost_deals": lost_deals,
            "win_rate": win_rate,
            "pipeline_value": pipeline_value,
            "revenue": revenue,
            "average_deal_size": average_deal_size,
        },
        "pipeline_by_stage": pipeline_by_stage,
        "top_customers": top_customers,
        "salesperson_performance": salesperson_rows,
        "salespeople": [
            {
                "id": str(sp.id),
                "name": sp.get_full_name() or sp.username,
            }
            for sp in filterable_salespeople(user)
        ],
        "products": get_product_report_metrics(user),
    }


def parse_report_filters(request) -> tuple[int, int, str | None]:
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
    return year, month, salesperson_id
