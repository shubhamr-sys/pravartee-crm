"""
Product category migration tests.
"""
from decimal import Decimal
from importlib import import_module

from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.categories import LEGACY_CATEGORY_MAPPING, PRODUCT_CATEGORIES
from apps.leads.models import Lead, LeadStage, ProductCategory

User = get_user_model()
category_migration = import_module("apps.leads.migrations.0003_update_product_categories")


class ProductCategoryMigrationTestCase(TransactionTestCase):
    def test_migration_maps_legacy_categories(self):
        ProductCategory.objects.all().delete()
        stage = LeadStage.objects.get(name="New")
        legacy_categories = {}
        for name in LEGACY_CATEGORY_MAPPING:
            legacy_categories[name] = ProductCategory.objects.create(name=name)

        leads_before = {}
        for old_name, new_name in LEGACY_CATEGORY_MAPPING.items():
            lead = Lead.objects.create(
                customer_name=f"Lead {old_name}",
                category=legacy_categories[old_name],
                stage=stage,
                estimated_value=Decimal("1000.00"),
            )
            leads_before[old_name] = lead

        category_migration.forwards(apps=self._apps(), schema_editor=None)

        self.assertEqual(
            list(ProductCategory.objects.order_by("name").values_list("name", flat=True)),
            sorted(PRODUCT_CATEGORIES),
        )
        self.assertEqual(Lead.objects.count(), len(leads_before))

        for old_name, new_name in LEGACY_CATEGORY_MAPPING.items():
            lead = leads_before[old_name]
            lead.refresh_from_db()
            self.assertEqual(lead.category.name, new_name)

    def _apps(self):
        from django.apps import apps

        return apps


class ProductCategoryAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ceo = User.objects.create_user(
            username="ceo_categories",
            email="ceo_categories@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )

    def test_category_api_returns_new_master_list(self):
        client = APIClient()
        client.force_authenticate(user=self.ceo)
        response = client.get("/api/v1/leads/categories/")
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, sorted(PRODUCT_CATEGORIES))
