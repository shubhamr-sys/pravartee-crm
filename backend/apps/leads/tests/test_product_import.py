"""
Tests for bulk product CSV import.
"""
import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import Brand, Product, ProductCategory, ProductModel
from apps.leads.product_import import import_products_from_csv
from apps.leads.uom import LeadItemUOM


class ProductImportServiceTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category_it = ProductCategory.objects.get(name="IT")

    def test_import_creates_hierarchy_and_line_items(self):
        csv_data = """category,product,brand,model,quantity,uom,specification,remarks
IT,Monitor,LG,UltraWide 34,3,NOS,34-inch curved,For reception
IT,Monitor,LG,,2,UNIT,,
"""
        result = import_products_from_csv(io.StringIO(csv_data))
        self.assertEqual(result.processed_rows, 2)
        self.assertEqual(result.created_products, 1)
        self.assertEqual(result.created_brands, 1)
        self.assertEqual(result.created_models, 1)
        self.assertEqual(len(result.line_items), 2)
        self.assertEqual(result.line_items[0].quantity, 3)
        self.assertEqual(result.line_items[0].uom, LeadItemUOM.NOS)
        self.assertEqual(result.line_items[0].specification, "34-inch curved")
        self.assertEqual(result.line_items[0].remarks, "For reception")
        self.assertEqual(result.line_items[1].quantity, 2)
        self.assertEqual(result.line_items[1].uom, LeadItemUOM.UNIT)
        self.assertTrue(
            ProductModel.objects.filter(
                brand__product__category=self.category_it,
                brand__name="LG",
                name="UltraWide 34",
            ).exists(),
        )

    def test_import_rejects_unknown_category(self):
        csv_data = """category,product,brand,model,quantity
Unknown,Widget,Acme,Model X,1
"""
        result = import_products_from_csv(io.StringIO(csv_data))
        self.assertEqual(result.processed_rows, 0)
        self.assertEqual(len(result.errors), 1)

    def test_import_rejects_invalid_uom(self):
        csv_data = """category,product,quantity,uom
IT,Keyboard,1,boxes
"""
        result = import_products_from_csv(io.StringIO(csv_data))
        self.assertEqual(result.processed_rows, 0)
        self.assertEqual(len(result.errors), 1)


class ProductBulkUploadAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        cls.salesperson = User.objects.create_user(
            username="import_sales",
            email="import_sales@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )
        cls.category_it = ProductCategory.objects.get(name="IT")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.salesperson)

    def test_bulk_upload_endpoint(self):
        csv_data = (
            "category,product,brand,model,quantity,uom,specification,remarks\n"
            "IT,Projector,Epson,EB-L200F,1,NOS,Bright room,Include mount\n"
        )
        upload = SimpleUploadedFile(
            "products.csv",
            csv_data.encode("utf-8"),
            content_type="text/csv",
        )
        response = self.client.post(
            "/api/v1/leads/masters/products/bulk-upload/",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["created"]["products"], 1)
        self.assertEqual(response.data["processed_rows"], 1)
        self.assertEqual(len(response.data["line_items"]), 1)
        self.assertEqual(response.data["line_items"][0]["quantity"], 1)
        self.assertEqual(response.data["line_items"][0]["uom"], LeadItemUOM.NOS)
        self.assertEqual(response.data["line_items"][0]["specification"], "Bright room")
        self.assertEqual(response.data["line_items"][0]["remarks"], "Include mount")
        self.assertTrue(
            Product.objects.filter(category=self.category_it, name="Projector").exists(),
        )
        self.assertTrue(
            Brand.objects.filter(product__name="Projector", name="Epson").exists(),
        )
        self.assertTrue(
            ProductModel.objects.filter(
                brand__product__name="Projector",
                name="EB-L200F",
            ).exists(),
        )

    def test_example_csv_download(self):
        response = self.client.get(
            "/api/v1/leads/masters/products/bulk-upload/example.csv",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode("utf-8")
        self.assertIn("category,product,brand,model,quantity,uom,specification,remarks", content)
