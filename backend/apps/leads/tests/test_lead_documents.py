"""
Tests for lead document uploads (Solution category only).
"""
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.leads.models import Lead, LeadDocument, LeadStage, Product, LeadItem, ProductCategory


class LeadDocumentAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        cls.salesperson = User.objects.create_user(
            username="docs_sales",
            email="docs_sales@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )
        cls.category_it = ProductCategory.objects.get(name="IT")
        cls.category_solution = ProductCategory.objects.get(name="Solution")
        cls.stage = LeadStage.objects.order_by("sequence").first()

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.salesperson)
        self.lead_it = Lead.objects.create(
            customer_name="IT Project",
            company_name="Acme",
            stage=self.stage,
            assigned_to=self.salesperson,
            category=self.category_it,
        )
        self.lead_solution = Lead.objects.create(
            customer_name="CCTV Project",
            company_name="Beta",
            stage=self.stage,
            assigned_to=self.salesperson,
            category=self.category_solution,
        )
        product = self.category_solution.products.first()
        if not product:
            product = Product.objects.create(
                category=self.category_solution,
                name="CCTV System",
            )
        LeadItem.objects.create(
            lead=self.lead_solution,
            category=self.category_solution,
            product=product,
            quantity=1,
        )

    def test_upload_rejected_without_solution_items(self):
        pdf = SimpleUploadedFile(
            "spec.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )
        response = self.client.post(
            f"/api/v1/leads/{self.lead_it.id}/documents/",
            {"file": pdf},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Solution", response.data["detail"])

    def test_upload_allowed_for_solution_lead(self):
        pdf = SimpleUploadedFile(
            "site-survey.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )
        response = self.client.post(
            f"/api/v1/leads/{self.lead_solution.id}/documents/",
            {"file": pdf},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["original_filename"], "site-survey.pdf")
        self.assertTrue(
            LeadDocument.objects.filter(lead=self.lead_solution).exists(),
        )

    def test_list_documents_on_lead_detail(self):
        pdf = SimpleUploadedFile(
            "drawing.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )
        self.client.post(
            f"/api/v1/leads/{self.lead_solution.id}/documents/",
            {"file": pdf},
            format="multipart",
        )
        response = self.client.get(f"/api/v1/leads/{self.lead_solution.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["documents"]), 1)

    def test_delete_document(self):
        pdf = SimpleUploadedFile(
            "drawing.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )
        upload = self.client.post(
            f"/api/v1/leads/{self.lead_solution.id}/documents/",
            {"file": pdf},
            format="multipart",
        )
        document_id = upload.data["id"]
        response = self.client.delete(
            f"/api/v1/leads/{self.lead_solution.id}/documents/{document_id}/",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(LeadDocument.objects.filter(pk=document_id).exists())
