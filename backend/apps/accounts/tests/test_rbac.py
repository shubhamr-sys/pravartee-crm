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
    """Prove hierarchical role-based access control across CRM endpoints."""

    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.create(name="Test Category")
        cls.stage = LeadStage.objects.get(name="New")

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
            first_name="Amit",
            last_name="Sharma",
            role=UserRole.SALES_HEAD,
        )
        cls.sales_a = User.objects.create_user(
            username="sales_a",
            email="salesa@test.com",
            password="pass12345",
            first_name="Raj",
            last_name="Kumar",
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

        cls.lead_ceo = Lead.objects.create(
            customer_name="Procurement Officer",
            company_name="CEO Account",
            estimated_value=Decimal("50000.00"),
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.ceo,
        )
        cls.lead_head = Lead.objects.create(
            customer_name="Amit Sharma",
            company_name="Head Account",
            estimated_value=Decimal("30000.00"),
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.sales_head,
        )
        cls.lead_sales = Lead.objects.create(
            customer_name="Raj Kumar",
            company_name="Sales Account",
            estimated_value=Decimal("10000.00"),
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.sales_a,
        )
        cls.lead_sales_b = Lead.objects.create(
            customer_name="Customer B",
            company_name="Company B",
            estimated_value=Decimal("20000.00"),
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.sales_b,
        )

        cls.activity_ceo = LeadActivity.objects.create(
            lead=cls.lead_ceo,
            user=cls.ceo,
            activity_type=ActivityType.LEAD_CREATED,
        )
        cls.activity_head = LeadActivity.objects.create(
            lead=cls.lead_head,
            user=cls.sales_head,
            activity_type=ActivityType.LEAD_CREATED,
        )
        cls.activity_sales = LeadActivity.objects.create(
            lead=cls.lead_sales,
            user=cls.sales_a,
            activity_type=ActivityType.LEAD_CREATED,
        )
        cls.activity_sales_b = LeadActivity.objects.create(
            lead=cls.lead_sales_b,
            user=cls.sales_b,
            activity_type=ActivityType.LEAD_CREATED,
        )

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _lead_ids_from_list(self, response):
        return {item["id"] for item in response.data["results"]}

    def _activity_ids_from_list(self, response):
        return {item["id"] for item in response.data["results"]}

    # --- Hierarchical lead visibility ---

    def test_ceo_sees_all_leads(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/leads/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 4)
        lead_ids = self._lead_ids_from_list(response)
        self.assertEqual(
            lead_ids,
            {
                str(self.lead_ceo.id),
                str(self.lead_head.id),
                str(self.lead_sales.id),
                str(self.lead_sales_b.id),
            },
        )

        detail = self.client.get(f"/api/v1/leads/{self.lead_ceo.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

    def test_sales_head_cannot_see_ceo_leads_in_list(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/leads/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        lead_ids = self._lead_ids_from_list(response)
        self.assertNotIn(str(self.lead_ceo.id), lead_ids)
        self.assertEqual(
            lead_ids,
            {
                str(self.lead_head.id),
                str(self.lead_sales.id),
                str(self.lead_sales_b.id),
            },
        )

    def test_sales_head_cannot_access_ceo_lead_detail(self):
        self._auth(self.sales_head)
        response = self.client.get(f"/api/v1/leads/{self.lead_ceo.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_head_cannot_update_ceo_lead(self):
        self._auth(self.sales_head)
        response = self.client.patch(
            f"/api/v1/leads/{self.lead_ceo.id}/",
            {"notes": "Should fail"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_head_can_access_non_ceo_leads(self):
        self._auth(self.sales_head)
        for lead in (self.lead_head, self.lead_sales, self.lead_sales_b):
            response = self.client.get(f"/api/v1/leads/{lead.id}/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_salesperson_sees_only_assigned_leads(self):
        self._auth(self.sales_a)
        response = self.client.get("/api/v1/leads/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        lead_ids = self._lead_ids_from_list(response)
        self.assertEqual(lead_ids, {str(self.lead_sales.id)})

    def test_salesperson_a_cannot_retrieve_salesperson_b_lead(self):
        self._auth(self.sales_a)
        response = self.client.get(f"/api/v1/leads/{self.lead_sales_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_a_cannot_update_salesperson_b_lead(self):
        self._auth(self.sales_a)
        response = self.client.patch(
            f"/api/v1/leads/{self.lead_sales_b.id}/",
            {"notes": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_a_cannot_delete_salesperson_b_lead(self):
        self._auth(self.sales_a)
        response = self.client.delete(f"/api/v1/leads/{self.lead_sales_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_a_can_access_own_lead(self):
        self._auth(self.sales_a)
        response = self.client.get(f"/api/v1/leads/{self.lead_sales.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

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

    def test_ceo_sees_all_activities(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 4)

    def test_sales_head_activities_exclude_ceo_lead_activities(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        activity_ids = self._activity_ids_from_list(response)
        self.assertNotIn(str(self.activity_ceo.id), activity_ids)
        self.assertEqual(
            activity_ids,
            {
                str(self.activity_head.id),
                str(self.activity_sales.id),
                str(self.activity_sales_b.id),
            },
        )

    def test_sales_head_cannot_view_ceo_lead_activities(self):
        self._auth(self.sales_head)
        response = self.client.get(
            f"/api/v1/activities/lead/{self.lead_ceo.id}/",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_sees_only_own_lead_activities(self):
        self._auth(self.sales_a)
        response = self.client.get("/api/v1/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        activity_ids = self._activity_ids_from_list(response)
        self.assertEqual(activity_ids, {str(self.activity_sales.id)})

    def test_salesperson_cannot_view_other_lead_activities(self):
        self._auth(self.sales_a)
        response = self.client.get(
            f"/api/v1/activities/lead/{self.lead_sales_b.id}/",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Dashboard visibility ---

    def test_ceo_dashboard_shows_all_metrics(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_active_leads"], 4)
        self.assertEqual(
            Decimal(str(response.data["pipeline_value"])),
            Decimal("110000.00"),
        )

    def test_sales_head_dashboard_excludes_ceo_leads(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_active_leads"], 3)
        self.assertEqual(
            Decimal(str(response.data["pipeline_value"])),
            Decimal("60000.00"),
        )

    def test_salesperson_dashboard_scoped_to_assigned_leads(self):
        self._auth(self.sales_a)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_active_leads"], 1)
        self.assertEqual(
            Decimal(str(response.data["pipeline_value"])),
            Decimal("10000.00"),
        )

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
