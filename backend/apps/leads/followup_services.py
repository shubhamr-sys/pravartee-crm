"""
Follow-up metrics and lead date synchronization.
"""
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.access import followups_for_user, leads_for_user
from apps.leads.models import FollowUp, FollowUpStatus, Lead

User = get_user_model()


def sync_lead_next_followup_date(lead: Lead) -> None:
    """Set lead.next_followup_date to the earliest pending follow-up date."""
    pending = (
        lead.followups.filter(status=FollowUpStatus.PENDING)
        .order_by("followup_date")
        .first()
    )
    lead.next_followup_date = pending.followup_date if pending else None
    lead.save(update_fields=["next_followup_date", "updated_at"])


def get_followup_dashboard_metrics(user: User) -> dict:
    """Role-scoped follow-up counts for dashboard widgets.

    Uses lead.next_followup_date so counts match the leads list OVERDUE badge
    (legacy dates and synced pending follow-ups share the same field).
    """
    today = timezone.localdate()
    leads = leads_for_user(user).filter(
        is_active=True,
        next_followup_date__isnull=False,
    )

    return {
        "today_followups": leads.filter(next_followup_date=today).count(),
        "overdue_followups": leads.filter(next_followup_date__lt=today).count(),
        "upcoming_followups": leads.filter(next_followup_date__gt=today).count(),
    }


def get_followup_report_metrics(
    user: User,
    start,
    end,
    leads_qs=None,
) -> dict:
    """Follow-up analysis for MBR report (period = calendar month)."""
    lead_ids = None
    if leads_qs is not None:
        lead_ids = set(leads_qs.values_list("id", flat=True))

    base = followups_for_user(user)
    if lead_ids is not None:
        base = base.filter(lead_id__in=lead_ids)

    today = timezone.localdate()
    pending = base.filter(status=FollowUpStatus.PENDING)
    completed = base.filter(
        status=FollowUpStatus.COMPLETED,
        completed_at__gte=start,
        completed_at__lt=end,
    )

    return {
        "today_followups": pending.filter(followup_date=today).count(),
        "overdue_followups": pending.filter(followup_date__lt=today).count(),
        "completed_followups": completed.count(),
    }


def get_salesperson_followups_completed(
    user: User,
    assignee: User,
    start,
    end,
) -> int:
    """Count completed follow-ups for a salesperson in a period."""
    return (
        followups_for_user(user)
        .filter(
            assigned_to=assignee,
            status=FollowUpStatus.COMPLETED,
            completed_at__gte=start,
            completed_at__lt=end,
        )
        .count()
    )
