from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedCRMUser, IsCEOOrSalesHead
from apps.accounts.serializers import UserProfileSerializer
from apps.expenses.access import expenses_for_user, visible_users_for_expenses
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
    get_expense_summary,
    reject_expense,
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
        qs = expenses_for_user(self.request.user)
        tab = self.request.query_params.get("tab", "").lower()
        if tab == "my":
            qs = qs.filter(submitted_by=self.request.user)
        return apply_expense_filters(
            qs,
            tab=tab,
            submitted_by=self.request.query_params.get("submitted_by", ""),
            category=self.request.query_params.get("category", ""),
            expense_date=self.request.query_params.get("expense_date", ""),
            search=self.request.query_params.get("search", ""),
        )

    def create(self, request, *args, **kwargs):
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


class VisibleExpenseUsersView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, IsCEOOrSalesHead]

    def get(self, request):
        users = visible_users_for_expenses(request.user).order_by(
            "first_name",
            "last_name",
            "username",
        )
        return Response(UserProfileSerializer(users, many=True).data)


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
