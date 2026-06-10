"""
Lead CRUD, filtering, and automatic activity logging tests.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.activities.models import ActivityType, LeadActivity
from apps.leads.models import Brand, Lead, LeadStage, Product, ProductCategory, ProductModel

User = get_user_model()


class LeadManagementTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.create(name="Solar")
        cls.stage_new = LeadStage.objects.get(name="New")
        cls.stage_pre_bid = LeadStage.objects.get(name="Pre Bid")
        cls.stage_won = LeadStage.objects.get(name="Won")

        cls.ceo = User.objects.create_user(
            username="ceo_leads",
            email="ceo_leads@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_leads",
            email="head_leads@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_leads",
            email="sales_leads@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )

        cls.category_it = ProductCategory.objects.get(name="IT")
        cls.product = Product.objects.get(category=cls.category_it, name="Laptop")
        cls.brand = Brand.objects.get(product=cls.product, name="Dell")
        cls.product_model = ProductModel.objects.get(brand=cls.brand, name="Latitude 5540")

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _item_payload(self, **overrides):
        data = {
            "category": str(self.category_it.id),
            "product": str(self.product.id),
            "brand": str(self.brand.id),
            "model": str(self.product_model.id),
            "quantity": 1,
            "uom": "NOS",
        }
        data.update(overrides)
        return data

    def test_create_lead_logs_activity(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "Acme Corp",
                "company_name": "Acme Industries",
                "stage": str(self.stage_new.id),
                "items": [self._item_payload()],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lead_id = response.data["id"]

        activities = LeadActivity.objects.filter(lead_id=lead_id)
        self.assertTrue(
            activities.filter(activity_type=ActivityType.LEAD_CREATED).exists(),
        )
        self.assertTrue(
            activities.filter(activity_type=ActivityType.LEAD_ASSIGNED).exists(),
        )

    def test_stage_change_logs_activity(self):
        lead = Lead.objects.create(
            customer_name="Stage Test",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        self._auth(self.salesperson)
        response = self.client.patch(
            f"/api/v1/leads/{lead.id}/",
            {"stage": str(self.stage_pre_bid.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        activity = LeadActivity.objects.filter(
            lead=lead,
            activity_type=ActivityType.STAGE_CHANGED,
        ).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.old_value, "New")
        self.assertEqual(activity.new_value, "Pre Bid")

    def test_won_stage_logs_closed_won_activity(self):
        lead = Lead.objects.create(
            customer_name="Won Test",
            category=self.category,
            stage=self.stage_pre_bid,
            assigned_to=self.salesperson,
        )
        self._auth(self.salesperson)
        self.client.patch(
            f"/api/v1/leads/{lead.id}/",
            {"stage": str(self.stage_won.id)},
            format="json",
        )
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=lead,
                activity_type=ActivityType.LEAD_CLOSED_WON,
            ).exists(),
        )

    def test_followup_update_logs_activity(self):
        lead = Lead.objects.create(
            customer_name="Follow-up Test",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        self._auth(self.salesperson)
        followup = timezone.localdate().isoformat()
        self.client.patch(
            f"/api/v1/leads/{lead.id}/",
            {"next_followup_date": followup},
            format="json",
        )
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=lead,
                activity_type=ActivityType.FOLLOWUP_UPDATED,
            ).exists(),
        )

    def test_lead_activities_endpoint(self):
        lead = Lead.objects.create(
            customer_name="Timeline Test",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        LeadActivity.objects.create(
            lead=lead,
            user=self.salesperson,
            activity_type=ActivityType.LEAD_CREATED,
            comments="Lead created.",
        )
        self._auth(self.salesperson)
        response = self.client.get(f"/api/v1/activities/lead/{lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIn("activity_label", response.data["results"][0])
        self.assertIn("description", response.data["results"][0])

    def test_filter_by_assigned_to(self):
        Lead.objects.create(
            customer_name="Assigned A",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        Lead.objects.create(
            customer_name="Assigned B",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.sales_head,
        )
        self._auth(self.ceo)
        response = self.client.get(
            "/api/v1/leads/",
            {"assigned_to": str(self.salesperson.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["customer_name"],
            "Assigned A",
        )

    def test_company_name_required_on_create(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "No Company",
                "company_name": "",
                "category": str(self.category.id),
                "stage": str(self.stage_new.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_item_quantity_rejected(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "Bad Qty",
                "company_name": "Bad Co",
                "stage": str(self.stage_new.id),
                "items": [self._item_payload(quantity=-1)],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assignment_activity_uses_usernames(self):
        self._auth(self.sales_head)
        lead = Lead.objects.create(
            customer_name="Assign Test",
            company_name="Assign Co",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        self.client.patch(
            f"/api/v1/leads/{lead.id}/",
            {"assigned_to": str(self.sales_head.id)},
            format="json",
        )
        activity = LeadActivity.objects.filter(
            lead=lead,
            activity_type=ActivityType.LEAD_ASSIGNED,
        ).order_by("-created_at").first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.old_value, self.salesperson.username)
        self.assertEqual(activity.new_value, self.sales_head.username)

    def test_salesperson_cannot_view_other_lead_detail(self):
        other_lead = Lead.objects.create(
            customer_name="Other Lead",
            company_name="Other Co",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.sales_head,
        )
        self._auth(self.salesperson)
        response = self.client.get(f"/api/v1/leads/{other_lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_cannot_edit_other_lead(self):
        other_lead = Lead.objects.create(
            customer_name="Other Edit",
            company_name="Other Co",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.sales_head,
        )
        self._auth(self.salesperson)
        response = self.client.patch(
            f"/api/v1/leads/{other_lead.id}/",
            {"notes": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_timeline_includes_change_summary(self):
        lead = Lead.objects.create(
            customer_name="Summary Lead",
            company_name="Summary Co",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        LeadActivity.objects.create(
            lead=lead,
            user=self.salesperson,
            activity_type=ActivityType.STAGE_CHANGED,
            old_value="New",
            new_value="Pre Bid",
        )
        self._auth(self.salesperson)
        response = self.client.get(f"/api/v1/activities/lead/{lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data["results"][0]
        self.assertEqual(item["change_summary"], "New → Pre Bid")
        self.assertEqual(item["user_username"], self.salesperson.username)

    def test_invalid_phone_rejected(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "Bad Phone",
                "company_name": "Bad Phone Co",
                "phone": "abc",
                "category": str(self.category.id),
                "stage": str(self.stage_new.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lead_summary_endpoint(self):
        Lead.objects.create(
            customer_name="Summary Lead",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
                        next_followup_date=timezone.localdate() - timedelta(days=1),
        )
        Lead.objects.create(
            customer_name="Future Lead",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
            next_followup_date=timezone.localdate() + timedelta(days=2),
        )
        self._auth(self.salesperson)
        response = self.client.get("/api/v1/leads/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_leads"], 2)
        self.assertEqual(response.data["overdue_followups"], 1)
        self.assertEqual(response.data["upcoming_followups"], 1)

    def test_sales_head_summary_excludes_ceo_leads(self):
        Lead.objects.create(
            customer_name="CEO Lead",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.ceo,
                    )
        Lead.objects.create(
            customer_name="Sales Lead",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
                    )
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/leads/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_leads"], 1)

    def test_followup_status_overdue(self):
        lead = Lead.objects.create(
            customer_name="Overdue Lead",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
            next_followup_date=timezone.localdate() - timedelta(days=2),
        )
        self._auth(self.salesperson)
        response = self.client.get(f"/api/v1/leads/{lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["followup_status"], "overdue")

    def test_followup_status_due_soon(self):
        lead = Lead.objects.create(
            customer_name="Due Soon Lead",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
            next_followup_date=timezone.localdate() + timedelta(days=2),
        )
        self._auth(self.salesperson)
        response = self.client.get(f"/api/v1/leads/{lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["followup_status"], "due_soon")

    def test_lead_detail_returns_full_customer_info(self):
        lead = Lead.objects.create(
            customer_name="Detail Lead",
            company_name="Detail Co",
            contact_person="Jane Doe",
            phone="9876543210",
            email="jane@detail.com",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        self._auth(self.salesperson)
        response = self.client.get(f"/api/v1/leads/{lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["customer_name"], "Detail Lead")
        self.assertEqual(response.data["company_name"], "Detail Co")
        self.assertEqual(response.data["contact_person"], "Jane Doe")
        self.assertEqual(response.data["email"], "jane@detail.com")

    def test_activity_timeline_newest_first(self):
        lead = Lead.objects.create(
            customer_name="Timeline Order",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        older = LeadActivity.objects.create(
            lead=lead,
            user=self.salesperson,
            activity_type=ActivityType.LEAD_CREATED,
            comments="Created.",
        )
        newer = LeadActivity.objects.create(
            lead=lead,
            user=self.salesperson,
            activity_type=ActivityType.NOTE_ADDED,
            comments="Note added.",
        )
        self._auth(self.salesperson)
        response = self.client.get(f"/api/v1/activities/lead/{lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(results[0]["id"], str(newer.id))
        self.assertEqual(results[1]["id"], str(older.id))

    def test_dashboard_includes_lead_widgets(self):
        Lead.objects.create(
            customer_name="Dashboard Lead",
            category=self.category,
            stage=self.stage_new,
            assigned_to=self.salesperson,
            next_followup_date=timezone.localdate(),
                    )
        self._auth(self.ceo)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("leads_by_stage", response.data)
        self.assertIn("upcoming_followups", response.data)
        self.assertIn("recent_activities", response.data)
        self.assertIn("recent_lead_updates", response.data)
        self.assertIn("products", response.data)
