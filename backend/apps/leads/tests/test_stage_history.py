"""
Lead stage history creation tests.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import Lead, LeadStage, ProductCategory, StageHistory

User = get_user_model()


class StageHistoryTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.get(name="IT")
        cls.stage_new = LeadStage.objects.get(name="New")
        cls.stage_pre_bid = LeadStage.objects.get(name="Pre Bid")
        cls.salesperson = User.objects.create_user(
            username="sales_stage_hist",
            email="sales_stage_hist@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )
        cls.lead = Lead.objects.create(
            customer_name="Stage History Lead",
            category=cls.category,
            stage=cls.stage_new,
            assigned_to=cls.salesperson,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.salesperson)

    def test_stage_change_creates_history(self):
        response = self.client.patch(
            f"/api/v1/leads/{self.lead.id}/",
            {"stage": str(self.stage_pre_bid.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history = StageHistory.objects.filter(lead=self.lead).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_stage, "New")
        self.assertEqual(history.new_stage, "Pre Bid")

    def test_stage_history_list_api(self):
        StageHistory.objects.create(
            lead=self.lead,
            old_stage="New",
            new_stage="Pre Bid",
            changed_by=self.salesperson,
        )
        response = self.client.get(f"/api/v1/leads/{self.lead.id}/stage-history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
