"""
Role-scoped lead list summary metrics.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone

from apps.accounts.access import leads_for_user
from apps.leads.stages import active_pipeline_leads

User = get_user_model()
DUE_SOON_DAYS = 3


def get_lead_list_metrics(user: User) -> dict:
    """Return summary cards data for the lead list page."""
    today = timezone.localdate()
    due_soon_cutoff = today + timedelta(days=DUE_SOON_DAYS)

    leads = leads_for_user(user).filter(is_active=True)
    pipeline_value = (
        active_pipeline_leads(leads).aggregate(total=Sum("estimated_value"))["total"] or 0
    )

    with_followup = leads.filter(next_followup_date__isnull=False)
    overdue = with_followup.filter(next_followup_date__lt=today).count()
    upcoming = with_followup.filter(next_followup_date__gte=today).count()
    due_soon = with_followup.filter(
        next_followup_date__gte=today,
        next_followup_date__lte=due_soon_cutoff,
    ).count()

    return {
        "total_leads": leads.count(),
        "pipeline_value": Decimal(str(pipeline_value)).quantize(Decimal("0.01")),
        "upcoming_followups": upcoming,
        "overdue_followups": overdue,
        "due_soon_followups": due_soon,
    }
