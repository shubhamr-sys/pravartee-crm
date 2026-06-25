"""
Lead item CRUD, master hierarchy validation, and product analytics tests.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import Brand, Lead, LeadStage, Product, ProductCategory, ProductModel

User = get_user_model()


class LeadItemTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category_it = ProductCategory.objects.get(name="IT")
        cls.category_solution = ProductCategory.objects.get(name="Solution")
        cls.stage_new = LeadStage.objects.get(name="New")
        cls.stage_won = LeadStage.objects.get(name="Won")

        cls.product = Product.objects.get(category=cls.category_it, name="Laptop")
        cls.brand = Brand.objects.get(product=cls.product, name="Dell")
        cls.product_model = ProductModel.objects.get(
            brand=cls.brand,
            name="Latitude 5540",
        )

        cls.ceo = User.objects.create_user(
            username="ceo_items",
            email="ceo_items@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_items",
            email="head_items@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
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
            "product": str(self.product.id),
            "brand": str(self.brand.id),
            "model": str(self.product_model.id),
            "quantity": 2,
            "uom": "NOS",
            "specification": "16GB RAM, 512GB SSD",
            "remarks": "Include docking stations",
        }
        data.update(overrides)
        return data

    def _lead_payload(self, **overrides):
        data = {
            "customer_name": "Acme Corp",
            "company_name": "Acme Industries",
            "contact_person": "Jane Doe",
            "phone": "9876543210",
            "stage": str(self.stage_new.id),
        }
        data.update(overrides)
        return data

    def test_create_lead_with_items(self):
        response = self.client.post(
            "/api/v1/leads/",
            {
                **self._lead_payload(),
                "items": [self._item_payload()],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["product_name"], "Laptop")
        self.assertEqual(response.data["items"][0]["brand_name"], "Dell")
        self.assertEqual(response.data["items"][0]["model_name"], "Latitude 5540")

        lead = Lead.objects.get(pk=response.data["id"])
        self.assertEqual(lead.items.count(), 1)

    def test_create_lead_with_product_only_item(self):
        response = self.client.post(
            "/api/v1/leads/",
            {
                **self._lead_payload(customer_name="Minimal Products", company_name="Minimal Co"),
                "items": [
                    {
                        "category": str(self.category_it.id),
                        "product": str(self.product.id),
                        "quantity": 3,
                        "uom": "NOS",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = response.data["items"][0]
        self.assertEqual(item["product_name"], "Laptop")
        self.assertEqual(item["brand_name"], "")
        self.assertEqual(item["model_name"], "")

    def test_hierarchy_validation_rejects_mismatched_brand(self):
        other_product = Product.objects.get(
            category=self.category_solution,
            name="CCTV System",
        )
        other_brand = Brand.objects.get(product=other_product, name="Hikvision")

        response = self.client.post(
            "/api/v1/leads/",
            {
                **self._lead_payload(customer_name="Invalid", company_name="Invalid Co"),
                "items": [
                    self._item_payload(brand=str(other_brand.id)),
                ],
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
        from apps.leads.models import LeadItem

        LeadItem.objects.create(
            lead=lead,
            category=self.category_it,
            product=self.product,
            brand=self.brand,
            product_model=self.product_model,
            quantity=5,
        )
        from apps.leads.lead_item_services import sync_lead_from_items

        sync_lead_from_items(lead)

        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        products = response.data["products"]
        self.assertEqual(products["total_product_quantity"], 5)

    def test_ceo_can_create_master_product(self):
        self.client.force_authenticate(user=self.ceo)
        response = self.client.post(
            "/api/v1/leads/masters/products/",
            {
                "category": str(self.category_it.id),
                "name": "New Product",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_salesperson_can_create_master_product(self):
        response = self.client.post(
            "/api/v1/leads/masters/products/",
            {
                "category": str(self.category_it.id),
                "name": "Sales Product",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_sales_head_can_create_master_brand(self):
        self.client.force_authenticate(user=self.sales_head)
        response = self.client.post(
            "/api/v1/leads/masters/brands/",
            {
                "product": str(self.product.id),
                "name": "Lenovo",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_salesperson_cannot_delete_master_product(self):
        response = self.client.delete(
            f"/api/v1/leads/masters/products/{self.product.id}/",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_cannot_update_master_product(self):
        response = self.client.patch(
            f"/api/v1/leads/masters/products/{self.product.id}/",
            {"name": "Renamed Laptop"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_products_filtered_by_category(self):
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get(
            "/api/v1/leads/masters/products/",
            {"category": str(self.category_it.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in response.data["results"]]
        self.assertIn("Laptop", names)
