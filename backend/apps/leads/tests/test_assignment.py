"""
Lead assignment tests for create and update flows.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import Lead, LeadStage, ProductCategory

User = get_user_model()


class LeadAssignmentTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.create(name="Assignment Category")
        cls.stage = LeadStage.objects.get(name="New")

        cls.ceo = User.objects.create_user(
            username="ceo_assign",
            email="ceo_assign@test.com",
            password="pass12345",
            first_name="CEO",
            last_name="Assign",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_assign",
            email="head_assign@test.com",
            password="pass12345",
            first_name="Head",
            last_name="Assign",
            role=UserRole.SALES_HEAD,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_assign",
            email="sales_assign@test.com",
            password="pass12345",
            first_name="Sales",
            last_name="Assign",
            role=UserRole.SALESPERSON,
        )
        cls.other_salesperson = User.objects.create_user(
            username="sales_other",
            email="sales_other@test.com",
            password="pass12345",
            first_name="Other",
            last_name="Sales",
            role=UserRole.SALESPERSON,
        )

        cls.sales_head.manager = cls.ceo
        cls.sales_head.save(update_fields=["manager"])
        cls.salesperson.manager = cls.sales_head
        cls.salesperson.save(update_fields=["manager"])

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _lead_payload(self, **overrides):
        payload = {
            "customer_name": "Assignment Customer",
            "company_name": "Assignment Co",
            "contact_person": "Assign Contact",
            "phone": "9876543210",
            "category": str(self.category.id),
            "stage": str(self.stage.id),
        }
        payload.update(overrides)
        return payload

    # --- CEO assignment ---

    def test_ceo_creates_lead_assigned_to_ceo(self):
        self._auth(self.ceo)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.ceo.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.ceo.id))

    def test_ceo_creates_lead_assigned_to_sales_head(self):
        self._auth(self.ceo)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.sales_head.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.sales_head.id))

    def test_ceo_creates_lead_assigned_to_salesperson(self):
        self._auth(self.ceo)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.salesperson.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.salesperson.id))

    # --- Sales Head assignment ---

    def test_sales_head_creates_lead_assigned_to_self_when_omitted(self):
        self._auth(self.sales_head)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.sales_head.id))

    def test_sales_head_creates_lead_assigned_to_self(self):
        self._auth(self.sales_head)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.sales_head.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.sales_head.id))

    def test_sales_head_creates_lead_assigned_to_salesperson(self):
        self._auth(self.sales_head)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.salesperson.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.salesperson.id))

    def test_sales_head_cannot_assign_lead_to_salesperson_outside_team(self):
        self._auth(self.sales_head)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.other_salesperson.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sales_head_cannot_assign_lead_to_ceo(self):
        self._auth(self.sales_head)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.ceo.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Salesperson assignment ---

    def test_salesperson_creates_lead_assigned_to_self_when_omitted(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.salesperson.id))

    def test_salesperson_creates_lead_assigned_to_self_when_explicit(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.salesperson.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["assigned_to"]), str(self.salesperson.id))

    def test_salesperson_cannot_assign_lead_to_another_user(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/leads/",
            self._lead_payload(assigned_to=str(self.other_salesperson.id)),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Update assignment ---

    def test_ceo_can_update_lead_assignment_to_self(self):
        lead = Lead.objects.create(
            customer_name="Reassign Me",
            company_name="Reassign Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
        )
        self._auth(self.ceo)
        response = self.client.patch(
            f"/api/v1/leads/{lead.id}/",
            {"assigned_to": str(self.ceo.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["assigned_to"]), str(self.ceo.id))

    def test_sales_head_can_update_lead_assignment_to_self(self):
        lead = Lead.objects.create(
            customer_name="Head Reassign",
            company_name="Head Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
        )
        self._auth(self.sales_head)
        response = self.client.patch(
            f"/api/v1/leads/{lead.id}/",
            {"assigned_to": str(self.sales_head.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["assigned_to"]), str(self.sales_head.id))

    # --- Assignable users API ---

    def test_assignable_users_for_ceo_includes_all_roles(self):
        self._auth(self.ceo)
        response = self.client.get("/api/v1/auth/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {item["id"] for item in response.data}
        self.assertIn(str(self.ceo.id), user_ids)
        self.assertIn(str(self.sales_head.id), user_ids)
        self.assertIn(str(self.salesperson.id), user_ids)

    def test_assignable_users_for_sales_head_includes_self_and_team_salespersons(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/auth/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {item["id"] for item in response.data}
        self.assertIn(str(self.sales_head.id), user_ids)
        self.assertIn(str(self.salesperson.id), user_ids)
        self.assertNotIn(str(self.ceo.id), user_ids)
        self.assertNotIn(str(self.other_salesperson.id), user_ids)
