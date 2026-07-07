"""
Follow-up nudge emails for lead assignees (CEO, Sales Head, Salesperson).
"""
from dataclasses import dataclass, field

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from apps.accounts.choices import UserRole
from apps.leads.models import Lead

User = get_user_model()

NUDGE_ELIGIBLE_ROLES = (
    UserRole.CEO,
    UserRole.SALES_HEAD,
    UserRole.SALESPERSON,
)


@dataclass
class NudgeLeadRow:
    customer_name: str
    company_name: str
    stage_name: str
    next_followup_date: str | None
    lead_url: str


@dataclass
class AssigneeNudgeContext:
    assignee_name: str
    overdue_leads: list[NudgeLeadRow] = field(default_factory=list)
    due_today_leads: list[NudgeLeadRow] = field(default_factory=list)
    no_followup_leads: list[NudgeLeadRow] = field(default_factory=list)

    @property
    def total_count(self) -> int:
        return (
            len(self.overdue_leads)
            + len(self.due_today_leads)
            + len(self.no_followup_leads)
        )


@dataclass
class NudgeEmailStats:
    sent: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "sent": self.sent,
            "skipped": self.skipped,
            "errors": self.errors,
        }


def _frontend_lead_url(lead_id) -> str:
    base = settings.FRONTEND_PUBLIC_URL.rstrip("/")
    return f"{base}/leads/{lead_id}"


def _lead_row(lead: Lead) -> NudgeLeadRow:
    followup = (
        lead.next_followup_date.isoformat() if lead.next_followup_date else None
    )
    return NudgeLeadRow(
        customer_name=lead.customer_name,
        company_name=lead.company_name or "—",
        stage_name=lead.stage.name if lead.stage_id else "—",
        next_followup_date=followup,
        lead_url=_frontend_lead_url(lead.id),
    )


def build_assignee_nudge_context(user: User) -> AssigneeNudgeContext | None:
    today = timezone.localdate()
    leads = (
        Lead.objects.filter(is_active=True, assigned_to=user)
        .select_related("stage")
        .order_by("next_followup_date", "customer_name")
    )

    overdue = [_lead_row(lead) for lead in leads.filter(next_followup_date__lt=today)]
    due_today = [_lead_row(lead) for lead in leads.filter(next_followup_date=today)]
    no_followup = [
        _lead_row(lead) for lead in leads.filter(next_followup_date__isnull=True)
    ]

    if not overdue and not due_today and not no_followup:
        return None

    return AssigneeNudgeContext(
        assignee_name=user.get_full_name() or user.username,
        overdue_leads=overdue,
        due_today_leads=due_today,
        no_followup_leads=no_followup,
    )


def send_assignee_nudge_email(user: User, context: AssigneeNudgeContext) -> None:
    if not user.email:
        raise ValueError(f"User {user.username} has no email address.")

    parts = []
    if context.overdue_leads:
        parts.append(f"{len(context.overdue_leads)} overdue")
    if context.due_today_leads:
        parts.append(f"{len(context.due_today_leads)} due today")
    if context.no_followup_leads:
        parts.append(f"{len(context.no_followup_leads)} without follow-up")

    subject = f"CRM follow-up nudge — {', '.join(parts)}"
    template_context = {
        "assignee_name": context.assignee_name,
        "overdue_leads": context.overdue_leads,
        "due_today_leads": context.due_today_leads,
        "no_followup_leads": context.no_followup_leads,
        "leads_url": f"{settings.FRONTEND_PUBLIC_URL.rstrip('/')}/leads",
        "today": timezone.localdate().isoformat(),
    }
    message = render_to_string("leads/emails/assignee_nudge.txt", template_context)
    html_message = render_to_string("leads/emails/assignee_nudge.html", template_context)
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )


def nudge_eligible_assignees():
    return (
        User.objects.filter(
            is_active=True,
            role__in=NUDGE_ELIGIBLE_ROLES,
            assigned_leads__is_active=True,
        )
        .distinct()
        .order_by("last_name", "first_name", "username")
    )


def send_all_assignee_nudge_emails(*, dry_run: bool = False) -> NudgeEmailStats:
    stats = NudgeEmailStats()
    for user in nudge_eligible_assignees():
        context = build_assignee_nudge_context(user)
        if context is None:
            stats.skipped += 1
            continue
        if dry_run:
            stats.sent += 1
            continue
        try:
            send_assignee_nudge_email(user, context)
            stats.sent += 1
        except Exception as exc:
            stats.errors.append(f"{user.email or user.username}: {exc}")
    return stats
