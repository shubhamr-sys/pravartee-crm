"""
Lead item CRUD, totals, and product analytics tests.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import Lead, LeadItem, LeadStage, ProductCategory

User = get_user_model()


class LeadItemTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category_it = ProductCategory.objects.get(name="IT")
        cls.category_solution = ProductCategory.objects.get(name="Solution")
        cls.stage_new = LeadStage.objects.get(name="New")
        cls.stage_won = LeadStage.objects.get(name="Won")

        cls.ceo = User.objects.create_user(
            username="ceo_items",
            email="ceo_items@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_items",
            email="sales_items@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.salesperson)

    def _item_payload(self, **overrides):
        data = {
            "category": str(self.category_it.id),
            "product": "Dell Laptop",
            "brand": "Dell",
            "model": "Latitude 5540",
            "quantity": 2,
            "unit_price": "75000.00",
            "specification": "16GB RAM, 512GB SSD",
            "uom": "NOS",
            "remarks": "Include docking stations",
        }
        data.update(overrides)
        return data

    def test_create_lead_with_items_calculates_estimated_value(self):
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "Acme Corp",
                "company_name": "Acme Industries",
                "stage": str(self.stage_new.id),
                "items": [
                    self._item_payload(),
                    self._item_payload(
                        product="HP Printer",
                        brand="HP",
                        model="LaserJet",
                        quantity=1,
                        unit_price="25000.00",
                        category=str(self.category_it.id),
                    ),
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["items"]), 2)
        self.assertEqual(Decimal(response.data["estimated_value"]), Decimal("175000.00"))
        self.assertEqual(response.data["items"][0]["total_price"], "150000.00")
        self.assertEqual(response.data["items"][1]["total_price"], "25000.00")

        lead = Lead.objects.get(pk=response.data["id"])
        self.assertEqual(lead.items.count(), 2)
        self.assertEqual(lead.estimated_value, Decimal("175000.00"))

    def test_update_lead_replaces_items(self):
        lead = Lead.objects.create(
            customer_name="Replace Test",
            company_name="Replace Co",
            category=self.category_it,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        LeadItem.objects.create(
            lead=lead,
            category=self.category_it,
            product="Old Product",
            quantity=1,
            unit_price=Decimal("1000.00"),
        )
        lead.estimated_value = Decimal("1000.00")
        lead.save()

        response = self.client.patch(
            f"/api/v1/leads/{lead.id}/",
            {
                "items": [
                    self._item_payload(quantity=3, unit_price="10000.00"),
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(lead.items.count(), 1)
        lead.refresh_from_db()
        self.assertEqual(lead.estimated_value, Decimal("30000.00"))
        self.assertEqual(lead.items.first().product, "Dell Laptop")

    def test_create_lead_item_includes_uom_and_remarks(self):
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "UOM Test",
                "company_name": "UOM Co",
                "stage": str(self.stage_new.id),
                "items": [
                    self._item_payload(uom="PROJECT", remarks="Turnkey deployment scope"),
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = response.data["items"][0]
        self.assertEqual(item["uom"], "PROJECT")
        self.assertEqual(item["remarks"], "Turnkey deployment scope")

    def test_line_total_is_quantity_times_unit_price(self):
        item = LeadItem(
            lead=Lead.objects.create(
                customer_name="Line Total",
                company_name="Line Co",
                category=self.category_it,
                stage=self.stage_new,
                assigned_to=self.salesperson,
            ),
            category=self.category_it,
            product="Server",
            quantity=4,
            unit_price=Decimal("12500.50"),
        )
        item.save()
        self.assertEqual(item.total_price, Decimal("50002.00"))

    def test_legacy_create_with_category_only_still_works(self):
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "Legacy Lead",
                "company_name": "Legacy Co",
                "category": str(self.category_it.id),
                "stage": str(self.stage_new.id),
                "estimated_value": "42000.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["estimated_value"]), Decimal("42000.00"))

    def test_create_requires_items_or_category(self):
        response = self.client.post(
            "/api/v1/leads/",
            {
                "customer_name": "No Products",
                "company_name": "No Products Co",
                "stage": str(self.stage_new.id),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dashboard_includes_product_metrics(self):
        lead = Lead.objects.create(
            customer_name="Pipeline Products",
            company_name="Pipeline Co",
            category=self.category_it,
            stage=self.stage_new,
            assigned_to=self.salesperson,
        )
        LeadItem.objects.create(
            lead=lead,
            category=self.category_it,
            product="Cisco Switch",
            brand="Cisco",
            quantity=5,
            unit_price=Decimal("20000.00"),
        )
        sync_lead = Lead.objects.get(pk=lead.pk)
        from apps.leads.lead_item_services import sync_lead_from_items

        sync_lead_from_items(sync_lead)

        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        products = response.data["products"]
        self.assertEqual(products["total_product_quantity"], 5)
        self.assertEqual(Decimal(products["pipeline_value"]), Decimal("100000.00"))
        self.assertEqual(len(products["top_products"]), 1)
        self.assertEqual(products["top_products"][0]["product"], "Cisco Switch")

    def test_reports_include_product_metrics(self):
        lead = Lead.objects.create(
            customer_name="Won Products",
            company_name="Won Co",
            category=self.category_solution,
            stage=self.stage_won,
            assigned_to=self.salesperson,
        )
        LeadItem.objects.create(
            lead=lead,
            category=self.category_solution,
            product="CCTV Camera",
            brand="Hikvision",
            quantity=10,
            unit_price=Decimal("5000.00"),
        )
        from apps.leads.lead_item_services import sync_lead_from_items

        sync_lead_from_items(lead)

        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/reports/sales/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        products = response.data["products"]
        self.assertIn("quantity_by_product", products)
        self.assertIn("revenue_by_product", products)
        self.assertIn("revenue_by_category", products)
        self.assertIn("revenue_by_brand", products)
        self.assertIn("top_selling_products", products)
        self.assertEqual(len(products["top_selling_products"]), 1)
        self.assertEqual(products["top_selling_products"][0]["product"], "CCTV Camera")
