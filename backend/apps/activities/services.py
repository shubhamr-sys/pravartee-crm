"""
Automatic lead activity logging.
"""
from django.contrib.auth import get_user_model

from apps.leads.models import Lead
from apps.leads.stage_history_services import log_stage_history
from apps.leads.stages import LOST_STAGE as LOST_STAGE_NAME
from apps.leads.stages import WON_STAGE as WON_STAGE_NAME

from .models import ActivityType, LeadActivity

User = get_user_model()


def log_lead_activity(
    lead: Lead,
    user: User | None,
    activity_type: str,
    old_value: str = "",
    new_value: str = "",
    comments: str = "",
) -> LeadActivity:
    return LeadActivity.objects.create(
        lead=lead,
        user=user,
        activity_type=activity_type,
        old_value=old_value,
        new_value=new_value,
        comments=comments,
    )


def log_lead_created(lead: Lead, user: User | None) -> None:
    log_lead_activity(
        lead,
        user,
        ActivityType.LEAD_CREATED,
        comments=f"Lead created for project {lead.customer_name}.",
    )
    if lead.assigned_to_id:
        log_lead_activity(
            lead,
            user,
            ActivityType.LEAD_ASSIGNED,
            new_value=lead.assigned_to.username,
            comments=f"Assigned to {lead.assigned_to.username}.",
        )


def _stage_name(lead: Lead) -> str:
    return lead.stage.name if lead.stage_id else ""


def _format_assignee(lead: Lead) -> str:
    if lead.assigned_to_id:
        return lead.assigned_to.username
    return "Unassigned"


def log_stage_change(
    lead: Lead,
    user: User | None,
    old_stage: str,
    new_stage: str,
) -> None:
    if new_stage == WON_STAGE_NAME:
        activity_type = ActivityType.LEAD_CLOSED_WON
        comments = "Lead marked as won."
    elif new_stage == LOST_STAGE_NAME:
        activity_type = ActivityType.LEAD_CLOSED_LOST
        comments = "Lead marked as lost."
    else:
        activity_type = ActivityType.STAGE_CHANGED
        comments = f"Stage changed from {old_stage} to {new_stage}."

    log_lead_activity(
        lead,
        user,
        activity_type,
        old_value=old_stage,
        new_value=new_stage,
        comments=comments,
    )


def _format_gut_feeling(percent) -> str:
    if percent is None:
        return "None"
    return f"{percent}%"


def log_lead_updated(lead: Lead, user: User | None, previous: Lead) -> None:
    """Record activities for meaningful field changes on an existing lead."""
    changed = False

    old_stage = _stage_name(previous)
    new_stage = _stage_name(lead)
    if old_stage != new_stage:
        log_stage_change(lead, user, old_stage, new_stage)
        log_stage_history(lead, user, old_stage, new_stage)
        changed = True

    old_assignee = _format_assignee(previous)
    new_assignee = _format_assignee(lead)
    if old_assignee != new_assignee:
        log_lead_activity(
            lead,
            user,
            ActivityType.LEAD_ASSIGNED,
            old_value=old_assignee,
            new_value=new_assignee,
            comments=f"Assigned from {old_assignee} to {new_assignee}.",
        )
        changed = True

    old_followup = (
        previous.next_followup_date.isoformat()
        if previous.next_followup_date
        else ""
    )
    new_followup = (
        lead.next_followup_date.isoformat() if lead.next_followup_date else ""
    )
    if old_followup != new_followup:
        log_lead_activity(
            lead,
            user,
            ActivityType.FOLLOWUP_UPDATED,
            old_value=old_followup or "None",
            new_value=new_followup or "None",
            comments="Follow-up date updated.",
        )
        changed = True

    if previous.gut_feeling_percent != lead.gut_feeling_percent:
        log_lead_activity(
            lead,
            user,
            ActivityType.GUT_FEELING_UPDATED,
            old_value=_format_gut_feeling(previous.gut_feeling_percent),
            new_value=_format_gut_feeling(lead.gut_feeling_percent),
            comments="Gut feeling updated.",
        )
        changed = True

    if previous.notes != lead.notes:
        log_lead_activity(
            lead,
            user,
            ActivityType.NOTE_ADDED,
            old_value=previous.notes,
            new_value=lead.notes,
            comments="Notes updated.",
        )
        changed = True

    if not changed:
        log_lead_activity(
            lead,
            user,
            ActivityType.LEAD_UPDATED,
            comments="Lead details updated.",
        )


def log_price_requested(lead: Lead, user: User | None) -> LeadActivity:
    return log_lead_activity(
        lead,
        user,
        ActivityType.PRICE_REQUESTED,
        comments="Asked for price.",
    )


def _followup_assignee_name(followup) -> str:
    assignee = followup.assigned_to
    return assignee.get_full_name() or assignee.username


def _format_followup_date(value) -> str:
    if not value:
        return "None"
    return value.isoformat()


def log_followup_scheduled(
    followup,
    user: User | None,
    previous_next_date=None,
) -> LeadActivity:
    lead = followup.lead
    remarks = f" Remarks: {followup.remarks}" if followup.remarks else ""
    return log_lead_activity(
        lead,
        user,
        ActivityType.FOLLOWUP_SCHEDULED,
        old_value=_format_followup_date(previous_next_date),
        new_value=_format_followup_date(lead.next_followup_date),
        comments=(
            f"Follow-up scheduled: {followup.get_followup_type_display()} on "
            f"{followup.followup_date}. Assigned to {_followup_assignee_name(followup)}."
            f"{remarks}"
        ),
    )


def log_followup_modified(followup, user: User | None) -> LeadActivity:
    lead = followup.lead
    remarks = f" Remarks: {followup.remarks}" if followup.remarks else ""
    return log_lead_activity(
        lead,
        user,
        ActivityType.FOLLOWUP_UPDATED,
        new_value=followup.followup_date.isoformat(),
        comments=(
            f"Follow-up updated: {followup.get_followup_type_display()} on "
            f"{followup.followup_date}. Assigned to {_followup_assignee_name(followup)}."
            f"{remarks}"
        ),
    )


def log_followup_completed(followup, user: User | None) -> LeadActivity:
    lead = followup.lead
    return log_lead_activity(
        lead,
        user,
        ActivityType.FOLLOWUP_COMPLETED,
        new_value=followup.followup_date.isoformat(),
        comments=(
            f"Follow-up completed: {followup.get_followup_type_display()} on "
            f"{followup.followup_date}. Action: {followup.action_taken}"
            f"{f' Remarks: {followup.remarks}' if followup.remarks else ''}"
        ),
    )


def _expense_amount_label(expense) -> str:
    return f"₹{expense.amount}"


def log_expense_submitted(expense, user: User | None) -> LeadActivity | None:
    if not expense.lead_id:
        return None
    notes = f" {expense.description}" if (expense.description or "").strip() else ""
    return log_lead_activity(
        expense.lead,
        user,
        ActivityType.EXPENSE_SUBMITTED,
        new_value=_expense_amount_label(expense),
        comments=(
            f"Expense submitted: {expense.get_category_display()} — "
            f"{_expense_amount_label(expense)} on {expense.expense_date}."
            f"{notes}"
        ),
    )


def log_expense_approved(expense, user: User | None) -> LeadActivity | None:
    if not expense.lead_id:
        return None
    notes = f" Notes: {expense.review_notes}" if (expense.review_notes or "").strip() else ""
    return log_lead_activity(
        expense.lead,
        user,
        ActivityType.EXPENSE_APPROVED,
        old_value="Pending",
        new_value="Approved",
        comments=(
            f"Expense approved: {expense.get_category_display()} — "
            f"{_expense_amount_label(expense)}."
            f"{notes}"
        ),
    )


def log_expense_rejected(expense, user: User | None) -> LeadActivity | None:
    if not expense.lead_id:
        return None
    notes = f" Notes: {expense.review_notes}" if (expense.review_notes or "").strip() else ""
    return log_lead_activity(
        expense.lead,
        user,
        ActivityType.EXPENSE_REJECTED,
        old_value="Pending",
        new_value="Rejected",
        comments=(
            f"Expense rejected: {expense.get_category_display()} — "
            f"{_expense_amount_label(expense)}."
            f"{notes}"
        ),
    )
