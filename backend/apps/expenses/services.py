from django.db.models import Q, Sum
from django.utils import timezone

from apps.expenses.access import expenses_for_user
from apps.expenses.choices import ExpenseStatus


def get_expense_summary(user):
    qs = expenses_for_user(user)
    pending_qs = qs.filter(status=ExpenseStatus.PENDING)
    approved_qs = qs.filter(status=ExpenseStatus.APPROVED)
    rejected_qs = qs.filter(status=ExpenseStatus.REJECTED)
    return {
        "pending_count": pending_qs.count(),
        "approved_count": approved_qs.count(),
        "rejected_count": rejected_qs.count(),
        "total_pending_amount": pending_qs.aggregate(total=Sum("amount"))["total"] or 0,
        "total_approved_amount": approved_qs.aggregate(total=Sum("amount"))["total"] or 0,
    }


def apply_expense_filters(qs, *, tab="", submitted_by="", category="", expense_date="", search=""):
    if tab == "my":
        pass  # caller should filter submitted_by separately when needed
    elif tab == "pending":
        qs = qs.filter(status=ExpenseStatus.PENDING)
    elif tab == "approved":
        qs = qs.filter(status=ExpenseStatus.APPROVED)
    elif tab == "rejected":
        qs = qs.filter(status=ExpenseStatus.REJECTED)

    if submitted_by:
        qs = qs.filter(submitted_by_id=submitted_by)

    if category:
        qs = qs.filter(category=category)

    if expense_date:
        qs = qs.filter(expense_date=expense_date)

    if search.strip():
        term = search.strip()
        qs = qs.filter(
            Q(description__icontains=term)
            | Q(lead__customer_name__icontains=term)
            | Q(lead__company_name__icontains=term),
        )

    return qs


def approve_expense(expense, reviewer, review_notes=""):
    expense.status = ExpenseStatus.APPROVED
    expense.reviewed_by = reviewer
    expense.reviewed_at = timezone.now()
    expense.review_notes = review_notes or ""
    expense.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
            "updated_at",
        ],
    )
    return expense


def reject_expense(expense, reviewer, review_notes=""):
    expense.status = ExpenseStatus.REJECTED
    expense.reviewed_by = reviewer
    expense.reviewed_at = timezone.now()
    expense.review_notes = review_notes or ""
    expense.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
            "updated_at",
        ],
    )
    return expense
