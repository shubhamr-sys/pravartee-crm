"""
Follow-up CRUD, completion, and overdue metrics tests.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.activities.models import ActivityType, LeadActivity
from apps.leads.followup_services import (
    get_followup_dashboard_metrics,
    sync_lead_next_followup_date,
)
from apps.leads.models import FollowUp, FollowUpStatus, Lead, LeadStage, ProductCategory

User = get_user_model()


class FollowUpTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.get(name="IT")
        cls.stage = LeadStage.objects.get(name="New")
        cls.ceo = User.objects.create_user(
            username="ceo_followup",
            email="ceo_followup@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_followup",
            email="sales_followup@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )
        cls.lead = Lead.objects.create(
            customer_name="Follow-up Lead",
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.salesperson,
        )

    def setUp(self):
        self.client = APIClient()

    def test_create_followup(self):
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post(
            f"/api/v1/leads/{self.lead.id}/follow-ups/",
            {
                "assigned_to": str(self.salesperson.id),
                "followup_date": (timezone.localdate() + timedelta(days=2)).isoformat(),
                "followup_type": "CALL",
                "remarks": "Call customer",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lead.refresh_from_db()
        self.assertIsNotNone(self.lead.next_followup_date)
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=self.lead,
                activity_type=ActivityType.FOLLOWUP_SCHEDULED,
            ).exists(),
        )

    def test_complete_followup_logs_activity(self):
        followup = FollowUp.objects.create(
            lead=self.lead,
            assigned_to=self.salesperson,
            followup_date=timezone.localdate(),
            created_by=self.salesperson,
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post(
            f"/api/v1/leads/{self.lead.id}/follow-ups/{followup.id}/complete/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        followup.refresh_from_db()
        self.assertEqual(followup.status, FollowUpStatus.COMPLETED)
        self.assertIsNotNone(followup.completed_at)
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=self.lead,
                activity_type=ActivityType.FOLLOWUP_COMPLETED,
            ).exists(),
        )

    def test_update_followup_logs_activity(self):
        followup = FollowUp.objects.create(
            lead=self.lead,
            assigned_to=self.salesperson,
            followup_date=timezone.localdate(),
            created_by=self.salesperson,
        )
        self.client.force_authenticate(user=self.salesperson)
        new_date = (timezone.localdate() + timedelta(days=5)).isoformat()
        response = self.client.patch(
            f"/api/v1/leads/{self.lead.id}/follow-ups/{followup.id}/",
            {"followup_date": new_date, "followup_type": "MEETING"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=self.lead,
                activity_type=ActivityType.FOLLOWUP_UPDATED,
            ).exists(),
        )

    def test_overdue_followup_metrics(self):
        FollowUp.objects.create(
            lead=self.lead,
            assigned_to=self.salesperson,
            followup_date=timezone.localdate() - timedelta(days=1),
            created_by=self.salesperson,
        )
        sync_lead_next_followup_date(self.lead)
        metrics = get_followup_dashboard_metrics(self.ceo)
        self.assertGreaterEqual(metrics["overdue_followups"], 1)

    def test_overdue_followup_metrics_from_lead_date_only(self):
        """Legacy leads may have next_followup_date without a FollowUp row."""
        self.lead.next_followup_date = timezone.localdate() - timedelta(days=2)
        self.lead.save(update_fields=["next_followup_date", "updated_at"])
        metrics = get_followup_dashboard_metrics(self.ceo)
        self.assertEqual(metrics["overdue_followups"], 1)
