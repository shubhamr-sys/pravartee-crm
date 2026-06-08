"""
Lead stage migration and pipeline stage business rules.
"""
from decimal import Decimal
from importlib import import_module

from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase

from apps.accounts.choices import UserRole
from apps.dashboard.services import get_dashboard_summary
from apps.leads.metrics import get_lead_list_metrics
from apps.leads.models import Lead, LeadStage, ProductCategory
from apps.leads.stages import ACTIVE_PIPELINE_STAGES, ALL_STAGES_ORDER

User = get_user_model()
stage_migration = import_module("apps.leads.migrations.0002_update_lead_stages")


class LeadStageMigrationTestCase(TransactionTestCase):
    def test_migration_maps_legacy_stages(self):
        LeadStage.objects.all().delete()
        category = ProductCategory.objects.create(name="Migration Cat")
        legacy = {
            "New": 1,
            "Contacted": 2,
            "Qualified": 3,
            "Quoted": 4,
            "Negotiation": 5,
            "Won": 6,
            "Lost": 7,
        }
        stages = {
            name: LeadStage.objects.create(name=name, sequence=seq)
            for name, seq in legacy.items()
        }
        lead = Lead.objects.create(
            customer_name="Legacy Lead",
            category=category,
            stage=stages["Negotiation"],
            estimated_value=Decimal("1000.00"),
        )

        stage_migration.forwards(apps=self._apps(), schema_editor=None)

        lead.refresh_from_db()
        self.assertEqual(lead.stage.name, "Bid Evaluation")
        self.assertEqual(
            list(LeadStage.objects.order_by("sequence").values_list("name", flat=True)),
            list(ALL_STAGES_ORDER),
        )

    def _apps(self):
        from django.apps import apps

        return apps


class PipelineValueTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.create(name="Pipeline Cat")
        cls.ceo = User.objects.create_user(
            username="ceo_stages",
            email="ceo_stages@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.stage_new = LeadStage.objects.get(name="New")
        cls.stage_won = LeadStage.objects.get(name="Won")

    def test_pipeline_value_excludes_closed_stages(self):
        Lead.objects.create(
            customer_name="Open Lead",
            category=self.category,
            stage=self.stage_new,
            estimated_value=Decimal("100000.00"),
        )
        Lead.objects.create(
            customer_name="Won Lead",
            category=self.category,
            stage=self.stage_won,
            estimated_value=Decimal("50000.00"),
        )

        summary = get_dashboard_summary(user=self.ceo)
        self.assertEqual(summary["pipeline_value"], Decimal("100000.00"))

        metrics = get_lead_list_metrics(self.ceo)
        self.assertEqual(metrics["pipeline_value"], Decimal("100000.00"))

    def test_active_pipeline_stage_names(self):
        self.assertEqual(
            ACTIVE_PIPELINE_STAGES,
            ("New", "Pre Bid", "Bid Floated", "Bid Evaluation"),
        )

    def test_stage_api_returns_new_order(self):
        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=self.ceo)
        response = client.get("/api/v1/leads/stages/")
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, list(ALL_STAGES_ORDER))
