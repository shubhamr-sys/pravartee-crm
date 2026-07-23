from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.activities.services import (
    log_expense_approved,
    log_expense_rejected,
)
from apps.expenses.access import expenses_for_user
from apps.expenses.choices import ExpenseCategory, ExpenseStatus


def _apply_month_filter(qs, month: str):
    """Filter queryset to a YYYY-MM calendar month when provided."""
    if not month or len(month) != 7 or month[4] != "-":
        return qs
    try:
        year, month_num = int(month[:4]), int(month[5:7])
    except ValueError:
        return qs
    return qs.filter(expense_date__year=year, expense_date__month=month_num)


def get_expense_dashboard(user, *, month: str = ""):
    qs = _apply_month_filter(expenses_for_user(user), month)
    summary = get_expense_summary_from_queryset(qs)

    category_rows = []
    for category_value, category_label in ExpenseCategory.choices:
        row_qs = qs.filter(category=category_value)
        category_rows.append(
            {
                "category": category_value,
                "category_display": category_label,
                "count": row_qs.count(),
                "amount": row_qs.aggregate(total=Sum("amount"))["total"] or 0,
                "pending_amount": row_qs.filter(status=ExpenseStatus.PENDING).aggregate(
                    total=Sum("amount"),
                )["total"]
                or 0,
            },
        )

    employee_rows = (
        qs.values("submitted_by_id", "submitted_by__first_name", "submitted_by__last_name", "submitted_by__username")
        .annotate(
            expense_count=Count("id"),
            pending_count=Count("id", filter=Q(status=ExpenseStatus.PENDING)),
            pending_amount=Sum("amount", filter=Q(status=ExpenseStatus.PENDING)),
            approved_amount=Sum("amount", filter=Q(status=ExpenseStatus.APPROVED)),
        )
        .order_by("-pending_amount", "-approved_amount")
    )
    by_employee = []
    for row in employee_rows:
        first = row["submitted_by__first_name"] or ""
        last = row["submitted_by__last_name"] or ""
        name = f"{first} {last}".strip() or row["submitted_by__username"]
        by_employee.append(
            {
                "user_id": str(row["submitted_by_id"]),
                "employee_name": name,
                "expense_count": row["expense_count"],
                "pending_count": row["pending_count"],
                "pending_amount": row["pending_amount"] or 0,
                "approved_amount": row["approved_amount"] or 0,
            },
        )

    recent_pending = list(
        qs.filter(status=ExpenseStatus.PENDING).order_by("-expense_date", "-created_at")[:10],
    )

    return {
        "month": month or None,
        "summary": summary,
        "by_category": category_rows,
        "by_employee": by_employee,
        "recent_pending_ids": [str(expense.id) for expense in recent_pending],
        "recent_pending": recent_pending,
    }


def get_expense_summary_from_queryset(qs):
    pending_qs = qs.filter(status=ExpenseStatus.PENDING)
    approved_qs = qs.filter(status=ExpenseStatus.APPROVED)
    rejected_qs = qs.filter(status=ExpenseStatus.REJECTED)
    return {
        "pending_count": pending_qs.count(),
        "approved_count": approved_qs.count(),
        "rejected_count": rejected_qs.count(),
        "total_pending_amount": pending_qs.aggregate(total=Sum("amount"))["total"] or 0,
        "total_approved_amount": approved_qs.aggregate(total=Sum("amount"))["total"] or 0,
        "total_rejected_amount": rejected_qs.aggregate(total=Sum("amount"))["total"] or 0,
    }


def get_expense_summary(user):
    return get_expense_summary_from_queryset(expenses_for_user(user))


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
            | Q(lead__company_name__icontains=term)
            | Q(submitted_by__first_name__icontains=term)
            | Q(submitted_by__last_name__icontains=term)
            | Q(submitted_by__username__icontains=term)
            | Q(category__icontains=term)
            | Q(review_notes__icontains=term),
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
    log_expense_approved(expense, reviewer)
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
    log_expense_rejected(expense, reviewer)
    return expense
