"""
Follow-up nudge email tests.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import Lead, LeadStage, ProductCategory
from apps.leads.nudge_emails import (
    build_assignee_nudge_context,
    send_all_assignee_nudge_emails,
)

User = get_user_model()


@override_settings(
    FRONTEND_PUBLIC_URL="http://localhost:3034",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class LeadNudgeEmailTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.create(name="Nudge Category")
        cls.stage = LeadStage.objects.get(name="New")

        cls.ceo = User.objects.create_user(
            username="ceo_nudge",
            email="ceo_nudge@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_nudge",
            email="sales_nudge@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )
        cls.commercial = User.objects.create_user(
            username="commercial_nudge",
            email="commercial_nudge@test.com",
            password="pass12345",
            role=UserRole.COMMERCIAL,
        )

    def setUp(self):
        self.client = APIClient()
        mail.outbox.clear()

    def test_build_assignee_nudge_context_groups_leads(self):
        today = timezone.localdate()
        Lead.objects.create(
            customer_name="Overdue Lead",
            company_name="Overdue Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
            next_followup_date=today - timedelta(days=2),
        )
        Lead.objects.create(
            customer_name="Today Lead",
            company_name="Today Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
            next_followup_date=today,
        )
        Lead.objects.create(
            customer_name="No Date Lead",
            company_name="No Date Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
        )

        context = build_assignee_nudge_context(self.salesperson)
        self.assertIsNotNone(context)
        assert context is not None
        self.assertEqual(len(context.overdue_leads), 1)
        self.assertEqual(len(context.due_today_leads), 1)
        self.assertEqual(len(context.no_followup_leads), 1)

    def test_ceo_assignee_receives_nudge_email(self):
        today = timezone.localdate()
        Lead.objects.create(
            customer_name="CEO Lead",
            company_name="CEO Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.ceo,
            next_followup_date=today - timedelta(days=1),
        )

        stats = send_all_assignee_nudge_emails()
        self.assertEqual(stats.sent, 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ceo_nudge@test.com"])
        self.assertIn("overdue", mail.outbox[0].subject.lower())

    def test_commercial_assignee_is_skipped(self):
        today = timezone.localdate()
        Lead.objects.create(
            customer_name="Commercial Lead",
            company_name="Commercial Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.commercial,
            next_followup_date=today - timedelta(days=1),
        )

        stats = send_all_assignee_nudge_emails()
        self.assertEqual(stats.sent, 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_ceo_can_trigger_nudge_api(self):
        today = timezone.localdate()
        Lead.objects.create(
            customer_name="API Lead",
            company_name="API Co",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
            next_followup_date=today,
        )

        self.client.force_authenticate(user=self.ceo)
        response = self.client.post("/api/v1/leads/nudge-emails/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sent"], 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_salesperson_cannot_trigger_nudge_api(self):
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post("/api/v1/leads/nudge-emails/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
