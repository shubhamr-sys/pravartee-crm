"""
Role-based queryset scoping for field visits.
"""
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from apps.accounts.hierarchy import visible_team_members_for_user
from apps.visits.models import FieldVisit

User = get_user_model()


def visits_for_user(user: User) -> QuerySet[FieldVisit]:
    qs = FieldVisit.objects.select_related("user")
    if user.is_ceo:
        return qs
    return qs.filter(
        user_id__in=visible_team_members_for_user(user).values_list("pk", flat=True),
    )


def user_can_access_visit(user: User, visit: FieldVisit) -> bool:
    if user.is_ceo:
        return True
    return visible_team_members_for_user(user).filter(pk=visit.user_id).exists()
