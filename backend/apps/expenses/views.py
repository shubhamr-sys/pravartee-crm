from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import (
    IsAuthenticatedCRMUser,
    IsCEOOrAccounts,
    IsExpenseManager,
)
from apps.accounts.serializers import UserProfileSerializer
from apps.expenses.access import expenses_for_user, visible_users_for_expenses
from apps.expenses.exporters import build_expenses_workbook
from apps.expenses.models import Expense
from apps.expenses.permissions import CanAccessExpense, CanReviewExpense
from apps.expenses.serializers import (
    ExpenseCreateSerializer,
    ExpenseReviewSerializer,
    ExpenseSerializer,
)
from apps.expenses.services import (
    apply_expense_filters,
    approve_expense,
    get_expense_dashboard,
    get_expense_summary,
    reject_expense,
)


def _filtered_expenses_for_request(request):
    qs = expenses_for_user(request.user)
    tab = request.query_params.get("tab", "").lower()
    if tab == "my":
        qs = qs.filter(submitted_by=request.user)
    return apply_expense_filters(
        qs,
        tab=tab,
        submitted_by=request.query_params.get("submitted_by", ""),
        category=request.query_params.get("category", ""),
        expense_date=request.query_params.get("expense_date", ""),
        search=request.query_params.get("search", ""),
    )


class ExpenseListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedCRMUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = {
        "expense_date": ["exact", "gte", "lte"],
        "category": ["exact"],
        "submitted_by": ["exact"],
        "status": ["exact"],
    }
    ordering_fields = ["expense_date", "amount", "created_at"]
    ordering = ["-expense_date", "-created_at"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ExpenseCreateSerializer
        return ExpenseSerializer

    def get_queryset(self):
        return _filtered_expenses_for_request(self.request)

    def create(self, request, *args, **kwargs):
        if getattr(request.user, "is_accounts", False):
            return Response(
                {"detail": "Accounts users cannot submit expenses."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        output = ExpenseSerializer(expense, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class ExpenseDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessExpense]
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        return expenses_for_user(self.request.user)


class ExpenseSummaryView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        return Response(get_expense_summary(request.user))


class ExpenseDashboardView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, IsCEOOrAccounts]

    def get(self, request):
        data = get_expense_dashboard(
            request.user,
            month=request.query_params.get("month", ""),
        )
        recent_pending = data.pop("recent_pending")
        data["recent_pending"] = ExpenseSerializer(
            recent_pending,
            many=True,
            context={"request": request},
        ).data
        return Response(data)


class VisibleExpenseUsersView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, IsExpenseManager]

    def get(self, request):
        users = visible_users_for_expenses(request.user).order_by(
            "first_name",
            "last_name",
            "username",
        )
        return Response(UserProfileSerializer(users, many=True).data)


class ExpenseExportView(APIView):
    """Export filtered expenses as Excel (.xlsx)."""

    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        qs = _filtered_expenses_for_request(request).order_by(
            "-expense_date",
            "-created_at",
        )
        expenses = list(qs)
        tab = (request.query_params.get("tab") or "all").lower() or "all"
        title = f"Expenses — {tab.replace('_', ' ').title()}"
        workbook = build_expenses_workbook(expenses, title=title)
        stamp = timezone.localdate().isoformat()
        filename = f"Expenses_{tab}_{stamp}.xlsx"
        return FileResponse(
            workbook,
            as_attachment=True,
            filename=filename,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )


class ExpenseApproveView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, CanReviewExpense]

    def post(self, request, pk):
        expense = get_object_or_404(
            expenses_for_user(request.user),
            pk=pk,
        )
        self.check_object_permissions(request, expense)
        serializer = ExpenseReviewSerializer(
            data=request.data,
            context={"expense": expense},
        )
        serializer.is_valid(raise_exception=True)
        updated = approve_expense(
            expense,
            request.user,
            serializer.validated_data.get("review_notes", ""),
        )
        return Response(
            ExpenseSerializer(updated, context={"request": request}).data,
        )


class ExpenseRejectView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, CanReviewExpense]

    def post(self, request, pk):
        expense = get_object_or_404(
            expenses_for_user(request.user),
            pk=pk,
        )
        self.check_object_permissions(request, expense)
        serializer = ExpenseReviewSerializer(
            data=request.data,
            context={"expense": expense},
        )
        serializer.is_valid(raise_exception=True)
        updated = reject_expense(
            expense,
            request.user,
            serializer.validated_data.get("review_notes", ""),
        )
        return Response(
            ExpenseSerializer(updated, context={"request": request}).data,
        )
