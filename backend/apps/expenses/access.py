"""
Role-based queryset scoping for expense records.
"""
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from apps.accounts.choices import UserRole
from apps.accounts.hierarchy import visible_team_members_for_user
from apps.expenses.models import Expense

User = get_user_model()


def expenses_for_user(user: User) -> QuerySet[Expense]:
    """Return expense records visible to the given user."""
    qs = Expense.objects.select_related(
        "submitted_by",
        "submitted_by__manager",
        "lead",
        "reviewed_by",
    )
    if user.is_ceo or getattr(user, "is_accounts", False):
        return qs
    return qs.filter(
        submitted_by_id__in=visible_team_members_for_user(user).values_list("pk", flat=True),
    )


def user_can_access_expense(user: User, expense: Expense) -> bool:
    if user.is_ceo or getattr(user, "is_accounts", False):
        return True
    return visible_team_members_for_user(user).filter(pk=expense.submitted_by_id).exists()


def user_can_review_expense(user: User, expense: Expense) -> bool:
    if not user_can_access_expense(user, expense):
        return False
    if expense.submitted_by_id == user.pk:
        return False
    return user.is_ceo or getattr(user, "is_accounts", False)


def visible_users_for_expenses(user: User) -> QuerySet[User]:
    base = User.objects.filter(is_active=True)
    if user.is_ceo or getattr(user, "is_accounts", False):
        return base.filter(
            role__in=[UserRole.CEO, UserRole.SALES_HEAD, UserRole.SALESPERSON],
        )
    return visible_team_members_for_user(user)
