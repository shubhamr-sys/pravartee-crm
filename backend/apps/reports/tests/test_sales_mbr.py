"""
Sales MBR report API tests — metrics and RBAC.
"""
from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from openpyxl import load_workbook
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.activities.models import ActivityType, LeadActivity
from apps.leads.models import Lead, LeadStage, ProductCategory

User = get_user_model()


class SalesMBRReportTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.create(name="Server")
        cls.stage_new = LeadStage.objects.create(name="New", sequence=1)
        cls.stage_qualified = LeadStage.objects.create(name="Qualified", sequence=3)
        cls.stage_won = LeadStage.objects.create(name="Won", sequence=6)
        cls.stage_lost = LeadStage.objects.create(name="Lost", sequence=7)

        cls.ceo = User.objects.create_user(
            username="ceo_mbr",
            email="ceo_mbr@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_mbr",
            email="head_mbr@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_mbr",
            email="sales_mbr@test.com",
            password="pass12345",
            first_name="Raj",
            last_name="Kumar",
            role=UserRole.SALESPERSON,
        )

        now = timezone.now()
        cls.lead_open = Lead.objects.create(
            customer_name="Acme Corp",
            company_name="Acme Industries",
            estimated_value=Decimal("100000.00"),
            category=cls.category,
            stage=cls.stage_qualified,
            assigned_to=cls.salesperson,
        )
        Lead.objects.filter(pk=cls.lead_open.pk).update(created_at=now)

        cls.lead_won = Lead.objects.create(
            customer_name="Beta Ltd",
            company_name="Beta Systems",
            estimated_value=Decimal("50000.00"),
            category=cls.category,
            stage=cls.stage_won,
            assigned_to=cls.salesperson,
        )
        Lead.objects.filter(pk=cls.lead_won.pk).update(created_at=now, updated_at=now)
        LeadActivity.objects.create(
            lead=cls.lead_won,
            user=cls.salesperson,
            activity_type=ActivityType.LEAD_CLOSED_WON,
            comments="Closed won",
        )

        cls.lead_ceo = Lead.objects.create(
            customer_name="CEO Account",
            company_name="Executive Co",
            estimated_value=Decimal("200000.00"),
            category=cls.category,
            stage=cls.stage_qualified,
            assigned_to=cls.ceo,
        )
        Lead.objects.filter(pk=cls.lead_ceo.pk).update(created_at=now)

    def setUp(self):
        self.client = APIClient()
        self.today = timezone.localdate()
        self.params = {
            "year": self.today.year,
            "month": self.today.month,
        }

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_ceo_can_view_sales_mbr(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/reports/sales/", self.params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("performance_summary", response.data)
        self.assertIn("pipeline_by_stage", response.data)
        self.assertGreaterEqual(
            response.data["performance_summary"]["total_leads"],
            2,
        )

    def test_sales_head_can_view_sales_mbr(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/reports/sales/", self.params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sales_head_excludes_ceo_owned_leads(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/reports/sales/", self.params)
        top_customers = response.data["top_customers"]
        companies = [item["company"] for item in top_customers]
        self.assertNotIn("Executive Co", companies)

    def test_salesperson_cannot_access_sales_mbr(self):
        self._auth(self.salesperson)
        response = self.client.get("/api/v1/reports/sales/", self.params)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_sales_mbr(self):
        response = self.client.get("/api/v1/reports/sales/", self.params)
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_salesperson_filter(self):
        self._auth(self.ceo)
        response = self.client.get(
            "/api/v1/reports/sales/",
            {**self.params, "salesperson": str(self.salesperson.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["salesperson_id"], str(self.salesperson.id))

    def test_invalid_month_returns_400(self):
        self._auth(self.ceo)
        response = self.client.get(
            "/api/v1/reports/sales/",
            {"year": self.today.year, "month": 13},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ceo_can_export_excel(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/reports/sales/export/", self.params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            "spreadsheetml",
            response["Content-Type"],
        )
        workbook = load_workbook(BytesIO(b"".join(response.streaming_content)))
        self.assertIn("Sales MBR", workbook.sheetnames)
        ws = workbook["Sales MBR"]
        self.assertEqual(ws["A1"].value.split("—")[0].strip(), "Sales MBR")

    def test_sales_head_can_export_excel(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/reports/sales/export/", self.params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_salesperson_cannot_export_excel(self):
        self._auth(self.salesperson)
        response = self.client.get("/api/v1/reports/sales/export/", self.params)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_won_deals_counted_in_summary(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/reports/sales/", self.params)
        self.assertGreaterEqual(response.data["performance_summary"]["won_deals"], 1)
        self.assertGreaterEqual(
            float(response.data["performance_summary"]["revenue"]),
            50000.0,
        )

    def test_salesperson_performance_includes_assignee(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/reports/sales/", self.params)
        names = [row["user"] for row in response.data["salesperson_performance"]]
        self.assertIn("Raj Kumar", names)
