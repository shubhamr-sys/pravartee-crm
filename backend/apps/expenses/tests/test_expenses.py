"""
Expense workflow tests.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.expenses.choices import ExpenseCategory, ExpenseStatus
from apps.expenses.models import Expense
from apps.leads.models import Lead, LeadStage, ProductCategory

User = get_user_model()


class ExpenseWorkflowTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.get(name="IT")
        cls.stage = LeadStage.objects.get(name="New")

        cls.ceo = User.objects.create_user(
            username="ceo_expense",
            email="ceo_expense@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_expense",
            email="head_expense@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_expense",
            email="sales_expense@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )
        cls.other_sales = User.objects.create_user(
            username="other_expense",
            email="other_expense@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )

        cls.sales_head.manager = cls.ceo
        cls.sales_head.save(update_fields=["manager"])
        cls.salesperson.manager = cls.sales_head
        cls.salesperson.save(update_fields=["manager"])
        cls.other_sales.manager = cls.sales_head
        cls.other_sales.save(update_fields=["manager"])

        cls.lead = Lead.objects.create(
            customer_name="Expense Lead",
            company_name="Expense Co",
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.salesperson,
        )

    def setUp(self):
        self.client = APIClient()

    def _create_expense(self, user, **kwargs):
        return Expense.objects.create(
            submitted_by=user,
            category=ExpenseCategory.TRAVEL,
            amount=Decimal("1500.00"),
            expense_date=timezone.localdate(),
            description="Client visit travel",
            lead=self.lead,
            **kwargs,
        )

    def test_salesperson_can_create_expense(self):
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post(
            "/api/v1/expenses/",
            {
                "category": ExpenseCategory.FOOD,
                "amount": "450.00",
                "expense_date": "2026-07-01",
                "description": "Lunch with client",
                "lead": str(self.lead.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ExpenseStatus.PENDING)
        self.assertEqual(Expense.objects.filter(submitted_by=self.salesperson).count(), 1)

    def test_salesperson_sees_only_own_expenses(self):
        self._create_expense(self.salesperson)
        self._create_expense(self.other_sales)
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get("/api/v1/expenses/", {"tab": "all"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_ceo_can_see_team_expenses(self):
        self._create_expense(self.salesperson)
        self._create_expense(self.other_sales)
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/expenses/", {"tab": "all"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_pending_tab_filters_pending_expenses(self):
        pending = self._create_expense(self.salesperson)
        approved = self._create_expense(
            self.other_sales,
            status=ExpenseStatus.APPROVED,
            reviewed_by=self.ceo,
            reviewed_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/expenses/", {"tab": "pending"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data["results"]}
        self.assertIn(str(pending.id), ids)
        self.assertNotIn(str(approved.id), ids)

    def test_sales_head_cannot_approve_expense(self):
        expense = self._create_expense(self.salesperson)
        self.client.force_authenticate(user=self.sales_head)
        response = self.client.post(
            f"/api/v1/expenses/{expense.id}/approve/",
            {"review_notes": "Approved for reimbursement"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        expense.refresh_from_db()
        self.assertEqual(expense.status, ExpenseStatus.PENDING)

    def test_ceo_can_approve_expense(self):
        expense = self._create_expense(self.salesperson)
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(
            f"/api/v1/expenses/{expense.id}/approve/",
            {"review_notes": "Approved for reimbursement"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expense.refresh_from_db()
        self.assertEqual(expense.status, ExpenseStatus.APPROVED)
        self.assertEqual(expense.reviewed_by_id, self.ceo.id)

    def test_salesperson_cannot_approve_own_expense(self):
        expense = self._create_expense(self.salesperson)
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post(f"/api/v1/expenses/{expense.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_expense_summary(self):
        self._create_expense(self.salesperson)
        self._create_expense(
            self.other_sales,
            status=ExpenseStatus.APPROVED,
            reviewed_by=self.ceo,
            reviewed_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/expenses/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pending_count"], 1)
        self.assertEqual(response.data["approved_count"], 1)
