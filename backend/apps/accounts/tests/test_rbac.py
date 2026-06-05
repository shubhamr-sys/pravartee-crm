"""
RBAC enforcement tests for leads, activities, and dashboard APIs.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.activities.models import ActivityType, LeadActivity
from apps.leads.models import Lead, LeadStage, ProductCategory

User = get_user_model()


class RBACAPITestCase(TestCase):
    """Prove role-based access control across CRM endpoints."""

    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.create(name="Test Category")
        cls.stage = LeadStage.objects.create(name="New", sequence=1)

        cls.ceo = User.objects.create_user(
            username="ceo_test",
            email="ceo@test.com",
            password="pass12345",
            first_name="CEO",
            last_name="Test",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_test",
            email="head@test.com",
            password="pass12345",
            first_name="Head",
            last_name="Test",
            role=UserRole.SALES_HEAD,
        )
        cls.sales_a = User.objects.create_user(
            username="sales_a",
            email="salesa@test.com",
            password="pass12345",
            first_name="Sales",
            last_name="A",
            role=UserRole.SALESPERSON,
        )
        cls.sales_b = User.objects.create_user(
            username="sales_b",
            email="salesb@test.com",
            password="pass12345",
            first_name="Sales",
            last_name="B",
            role=UserRole.SALESPERSON,
        )

        cls.lead_a = Lead.objects.create(
            customer_name="Customer A",
            company_name="Company A",
            estimated_value=Decimal("10000.00"),
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.sales_a,
        )
        cls.lead_b = Lead.objects.create(
            customer_name="Customer B",
            company_name="Company B",
            estimated_value=Decimal("20000.00"),
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.sales_b,
        )

        cls.activity_a = LeadActivity.objects.create(
            lead=cls.lead_a,
            user=cls.sales_a,
            activity_type=ActivityType.LEAD_CREATED,
        )
        cls.activity_b = LeadActivity.objects.create(
            lead=cls.lead_b,
            user=cls.sales_b,
            activity_type=ActivityType.LEAD_CREATED,
        )

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    # --- Lead visibility ---

    def test_salesperson_a_cannot_retrieve_salesperson_b_lead(self):
        self._auth(self.sales_a)
        response = self.client.get(f"/api/v1/leads/{self.lead_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_a_cannot_update_salesperson_b_lead(self):
        self._auth(self.sales_a)
        response = self.client.patch(
            f"/api/v1/leads/{self.lead_b.id}/",
            {"notes": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_a_cannot_delete_salesperson_b_lead(self):
        self._auth(self.sales_a)
        response = self.client.delete(f"/api/v1/leads/{self.lead_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_a_can_access_own_lead(self):
        self._auth(self.sales_a)
        response = self.client.get(f"/api/v1/leads/{self.lead_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_salesperson_list_shows_only_assigned_leads(self):
        self._auth(self.sales_a)
        response = self.client.get("/api/v1/leads/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(lead_ids, {str(self.lead_a.id)})

    def test_ceo_can_access_all_leads(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/leads/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(lead_ids, {str(self.lead_a.id), str(self.lead_b.id)})

        detail = self.client.get(f"/api/v1/leads/{self.lead_b.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

    def test_sales_head_can_access_all_leads(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/leads/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        detail = self.client.get(f"/api/v1/leads/{self.lead_a.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

    # --- Lead creation ---

    def test_salesperson_create_auto_assigns_to_self(self):
        self._auth(self.sales_a)
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "New Customer",
                "company_name": "New Co",
                "category": str(self.category.id),
                "stage": str(self.stage.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.sales_a.id))

    def test_salesperson_cannot_assign_lead_to_another_user(self):
        self._auth(self.sales_a)
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "Stolen Lead",
                "company_name": "Stolen Co",
                "category": str(self.category.id),
                "stage": str(self.stage.id),
                "assigned_to": str(self.sales_b.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Activity visibility ---

    def test_salesperson_sees_only_own_lead_activities(self):
        self._auth(self.sales_a)
        response = self.client.get("/api/v1/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        activity_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(activity_ids, {str(self.activity_a.id)})

    def test_salesperson_cannot_view_other_lead_activities(self):
        self._auth(self.sales_a)
        response = self.client.get(f"/api/v1/activities/lead/{self.lead_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ceo_sees_all_activities(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_sales_head_sees_all_activities(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    # --- Dashboard visibility ---

    def test_salesperson_dashboard_scoped_to_assigned_leads(self):
        self._auth(self.sales_a)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_active_leads"], 1)
        self.assertEqual(Decimal(str(response.data["pipeline_value"])), Decimal("10000.00"))

    def test_ceo_dashboard_shows_all_metrics(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_active_leads"], 2)
        self.assertEqual(Decimal(str(response.data["pipeline_value"])), Decimal("30000.00"))

    def test_sales_head_dashboard_shows_all_metrics(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_active_leads"], 2)

    # --- Authentication required ---

    def test_unauthenticated_leads_request_denied(self):
        response = self.client.get("/api/v1/leads/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_unauthenticated_dashboard_request_denied(self):
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
