"""
Role-based queryset scoping for CRM resources.
"""
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from apps.activities.models import LeadActivity
from apps.leads.models import Lead

User = get_user_model()


def user_sees_all_leads(user: User) -> bool:
    """CEO and Sales Head have organization-wide lead visibility."""
    return user.is_ceo or user.is_sales_head


def leads_for_user(user: User) -> QuerySet[Lead]:
    """Return leads visible to the given user based on CRM role."""
    qs = Lead.objects.select_related("assigned_to", "category", "stage")
    if user_sees_all_leads(user):
        return qs
    return qs.filter(assigned_to=user)


def activities_for_user(user: User) -> QuerySet[LeadActivity]:
    """Return activities visible to the given user based on CRM role."""
    qs = LeadActivity.objects.select_related("lead", "user")
    if user_sees_all_leads(user):
        return qs
    return qs.filter(lead__assigned_to=user)


def user_can_access_lead(user: User, lead: Lead) -> bool:
    """Object-level check: may this user access the given lead?"""
    if user_sees_all_leads(user):
        return True
    return lead.assigned_to_id == user.pk
