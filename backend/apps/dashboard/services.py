"""
Dashboard aggregation logic for CEO and management views.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.utils import timezone

from apps.accounts.access import user_sees_all_leads
from apps.leads.models import Lead

User = get_user_model()
STALE_LEAD_DAYS = 3


def get_dashboard_summary(user: User | None = None) -> dict:
    """
    Return CRM metrics scoped by user role.

    CEO and Sales Head see organization-wide metrics.
    Salesperson sees metrics for their assigned leads only.
    """
    now = timezone.now()
    stale_cutoff = now - timedelta(days=STALE_LEAD_DAYS)
    active_leads = Lead.objects.filter(is_active=True)

    if user and not user_sees_all_leads(user):
        active_leads = active_leads.filter(assigned_to=user)

    pipeline_value = active_leads.aggregate(total=Sum("estimated_value"))["total"] or 0

    leads_by_stage = (
        active_leads.values("stage__name")
        .annotate(count=Count("id"))
        .order_by("stage__sequence")
    )

    stale_leads = active_leads.filter(updated_at__lt=stale_cutoff).count()

    return {
        "pipeline_value": pipeline_value,
        "total_active_leads": active_leads.count(),
        "leads_by_stage": list(leads_by_stage),
        "stale_leads_count": stale_leads,
        "stale_lead_threshold_days": STALE_LEAD_DAYS,
    }
