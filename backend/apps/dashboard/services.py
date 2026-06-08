"""
Dashboard aggregation logic for CEO and management views.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.utils import timezone

from apps.accounts.access import activities_for_user, leads_for_user
from apps.activities.serializers import LeadActivitySerializer
from apps.attendance.metrics import get_attendance_metrics
from apps.leads.models import Lead
from apps.leads.product_metrics import get_pipeline_product_metrics
from apps.leads.serializers import LeadSerializer
from apps.leads.stages import active_pipeline_leads

User = get_user_model()
STALE_LEAD_DAYS = 3
UPCOMING_FOLLOWUP_DAYS = 7


def get_dashboard_summary(user: User | None = None) -> dict:
    """
    Return CRM metrics scoped by user role.

    CEO sees all metrics.
    Sales Head sees metrics for non-CEO-owned leads.
    Salesperson sees metrics for their assigned leads only.
    """
    now = timezone.now()
    today = timezone.localdate()
    stale_cutoff = now - timedelta(days=STALE_LEAD_DAYS)
    followup_cutoff = today + timedelta(days=UPCOMING_FOLLOWUP_DAYS)

    if user:
        active_leads = leads_for_user(user).filter(is_active=True)
    else:
        active_leads = Lead.objects.filter(is_active=True)

    pipeline_value = (
        active_pipeline_leads(active_leads).aggregate(total=Sum("estimated_value"))["total"]
        or 0
    )

    leads_by_stage = (
        active_leads.values("stage__name")
        .annotate(count=Count("id"))
        .order_by("stage__sequence")
    )

    stale_leads = active_leads.filter(updated_at__lt=stale_cutoff).count()

    upcoming_followups = (
        active_leads.filter(
            next_followup_date__isnull=False,
            next_followup_date__gte=today,
            next_followup_date__lte=followup_cutoff,
        )
        .select_related("assigned_to", "stage")
        .order_by("next_followup_date")[:10]
    )

    recent_lead_updates = (
        active_leads.select_related("assigned_to", "stage", "category")
        .order_by("-updated_at")[:10]
    )

    product_metrics = get_pipeline_product_metrics(user) if user else {}

    summary = {
        "pipeline_value": product_metrics.get("pipeline_value", pipeline_value),
        "total_active_leads": active_leads.count(),
        "products": product_metrics,
        "leads_by_stage": list(leads_by_stage),
        "stale_leads_count": stale_leads,
        "stale_lead_threshold_days": STALE_LEAD_DAYS,
        "upcoming_followups": LeadSerializer(
            upcoming_followups,
            many=True,
            context={"request": None},
        ).data,
        "recent_lead_updates": LeadSerializer(
            recent_lead_updates,
            many=True,
            context={"request": None},
        ).data,
    }

    if user:
        recent_activities = activities_for_user(user).order_by("-created_at")[:10]
        summary["recent_activities"] = LeadActivitySerializer(
            recent_activities,
            many=True,
        ).data
        summary["attendance"] = get_attendance_metrics(user)

    return summary
