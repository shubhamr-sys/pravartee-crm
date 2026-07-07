"""
Role-based queryset scoping for CRM resources.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from apps.accounts.hierarchy import visible_team_members_for_user
from apps.activities.models import LeadActivity
from apps.leads.models import FollowUp, Lead

User = get_user_model()


def user_sees_all_leads(user: User) -> bool:
    """
    Management privilege check (assign users, delete leads, etc.).

    CEO and Sales Head have elevated privileges; data visibility is scoped
    separately in leads_for_user() and activities_for_user().
    """
    return user.is_ceo or user.is_sales_head


def _team_assignee_ids(user: User):
    return visible_team_members_for_user(user).values_list("pk", flat=True)


def leads_for_user(user: User) -> QuerySet[Lead]:
    """Return leads visible to the given user based on CRM role hierarchy."""
    qs = Lead.objects.select_related("assigned_to", "category", "stage")
    if user.is_ceo:
        return qs
    return qs.filter(assigned_to_id__in=_team_assignee_ids(user))


def activities_for_user(user: User) -> QuerySet[LeadActivity]:
    """Return activities visible to the given user based on CRM role hierarchy."""
    qs = LeadActivity.objects.select_related("lead", "lead__assigned_to", "user")
    if user.is_ceo:
        return qs
    return qs.filter(lead__assigned_to_id__in=_team_assignee_ids(user))


def followups_for_user(user: User):
    """Return follow-ups visible to the given user based on CRM role hierarchy."""
    qs = FollowUp.objects.select_related(
        "lead",
        "lead__assigned_to",
        "assigned_to",
        "created_by",
    )
    if user.is_ceo:
        return qs
    team_ids = _team_assignee_ids(user)
    return qs.filter(
        Q(assigned_to_id__in=team_ids) | Q(lead__assigned_to_id__in=team_ids),
    )


def user_can_access_lead(user: User, lead: Lead) -> bool:
    """Object-level check: may this user access the given lead?"""
    if user.is_ceo:
        return True
    if lead.assigned_to_id is None:
        return False
    return visible_team_members_for_user(user).filter(pk=lead.assigned_to_id).exists()
