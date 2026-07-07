from django.urls import path

from .views import (
    ExpenseApproveView,
    ExpenseDetailView,
    ExpenseListCreateView,
    ExpenseRejectView,
    ExpenseSummaryView,
    VisibleExpenseUsersView,
)

app_name = "expenses"

urlpatterns = [
    path("", ExpenseListCreateView.as_view(), name="expense-list"),
    path("summary/", ExpenseSummaryView.as_view(), name="expense-summary"),
    path("users/", VisibleExpenseUsersView.as_view(), name="expense-users"),
    path("<uuid:pk>/", ExpenseDetailView.as_view(), name="expense-detail"),
    path("<uuid:pk>/approve/", ExpenseApproveView.as_view(), name="expense-approve"),
    path("<uuid:pk>/reject/", ExpenseRejectView.as_view(), name="expense-reject"),
]
