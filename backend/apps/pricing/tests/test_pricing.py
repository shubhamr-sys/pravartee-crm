"""
Pricing request workflow tests.
"""
import json
from decimal import Decimal
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.activities.models import ActivityType, LeadActivity
from apps.leads.models import Brand, Lead, LeadItem, LeadStage, Product, ProductCategory, ProductModel
from apps.pricing.models import PricingRequest, PricingRequestStatus
from apps.pricing.services import submit_pricing_response

User = get_user_model()


@override_settings(
    PRICING_COMMERCIAL_EMAILS=["commercial@test.com"],
    PRICING_PURCHASE_EMAILS=["purchase@test.com"],
    FRONTEND_PUBLIC_URL="http://localhost:3034",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class PricingWorkflowTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ProductCategory.objects.get(name="IT")
        cls.stage = LeadStage.objects.get(name="New")
        cls.product = Product.objects.get(category=cls.category, name="Laptop")
        cls.brand = Brand.objects.get(product=cls.product, name="Dell")
        cls.model = ProductModel.objects.get(brand=cls.brand, name="Latitude 5540")

        cls.ceo = User.objects.create_user(
            username="ceo_pricing",
            email="ceo_pricing@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_pricing",
            email="sales_pricing@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )
        cls.other_sales = User.objects.create_user(
            username="other_pricing",
            email="other_pricing@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
        )

        cls.lead = Lead.objects.create(
            customer_name="Pricing Customer",
            company_name="Pricing Co",
            category=cls.category,
            stage=cls.stage,
            assigned_to=cls.salesperson,
        )
        cls.lead_item = LeadItem.objects.create(
            lead=cls.lead,
            category=cls.category,
            product=cls.product,
            brand=cls.brand,
            product_model=cls.model,
            quantity=2,
            specification="16GB RAM",
            remarks="Urgent",
        )

    def setUp(self):
        self.client = APIClient()

    def test_create_pricing_request_sends_email(self):
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post(f"/api/v1/leads/{self.lead.id}/ask-for-price/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PricingRequest.objects.filter(lead=self.lead).count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Pricing Request", mail.outbox[0].subject)
        self.assertIn("http://localhost:3034/pricing-request/", mail.outbox[0].body)

    def test_pricing_request_email_includes_lead_location_details(self):
        self.lead.record_type = "VISIT"
        self.lead.address = "Tower A, Sector 62, Noida"
        self.lead.latitude = Decimal("28.535517")
        self.lead.longitude = Decimal("77.391029")
        self.lead.save(
            update_fields=["record_type", "address", "latitude", "longitude"],
        )

        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post(f"/api/v1/leads/{self.lead.id}/ask-for-price/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        body = mail.outbox[0].body
        self.assertIn("Record type: Visit", body)
        self.assertIn("Tower A, Sector 62, Noida", body)
        self.assertIn("maps.google.com", body)

    def test_cannot_create_duplicate_pending_pricing_request(self):
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.post(f"/api/v1/leads/{self.lead.id}/ask-for-price/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lead_shows_pending_pricing_request_flag(self):
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get(f"/api/v1/leads/{self.lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_pending_pricing_request"])

    def test_public_get_pricing_request(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
        )
        response = self.client.get(
            f"/api/v1/pricing/public/{pricing_request.token}/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["customer_name"], "Pricing Customer")
        self.assertEqual(len(response.data["line_items"]), 1)

    def test_public_submit_manual_pricing(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
        )
        response = self.client.post(
            f"/api/v1/pricing/public/{pricing_request.token}/submit/",
            {
                "line_items": [
                    {
                        "lead_item_id": str(self.lead_item.id),
                        "unit_price": "50000.00",
                        "remarks": "Best vendor rate",
                    }
                ],
                "response_remarks": "Submitted manually",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pricing_request.refresh_from_db()
        self.assertEqual(pricing_request.status, PricingRequestStatus.RESPONDED)
        self.assertTrue(pricing_request.generated_quotation_pdf)
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=self.lead,
                activity_type=ActivityType.QUOTATION_GENERATED,
            ).exists(),
        )
        self.assertEqual(len(mail.outbox), 1)

    def test_lead_includes_latest_price_pdf_url_after_response(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
        )
        self.client.post(
            f"/api/v1/pricing/public/{pricing_request.token}/submit/",
            {
                "line_items": [
                    {
                        "lead_item_id": str(self.lead_item.id),
                        "unit_price": "50000.00",
                        "remarks": "Best vendor rate",
                    }
                ],
            },
            format="json",
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get(f"/api/v1/leads/{self.lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data["latest_price_pdf_url"])

    def test_public_submit_manual_pricing_multipart_json_line_items(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
        )
        line_items = json.dumps(
            [
                {
                    "lead_item_id": str(self.lead_item.id),
                    "unit_price": "50000.00",
                    "remarks": "Best vendor rate",
                }
            ]
        )
        response = self.client.post(
            f"/api/v1/pricing/public/{pricing_request.token}/submit/",
            {
                "line_items": line_items,
                "response_remarks": "Submitted via multipart",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pricing_request.refresh_from_db()
        self.assertEqual(pricing_request.status, PricingRequestStatus.RESPONDED)

    def test_public_submit_vendor_pdf(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
        )
        pdf = SimpleUploadedFile(
            "vendor.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )
        response = self.client.post(
            f"/api/v1/pricing/public/{pricing_request.token}/submit/",
            {"vendor_quote_pdf": pdf, "response_remarks": "Vendor quote attached"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pricing_request.refresh_from_db()
        self.assertTrue(pricing_request.vendor_quote_pdf)
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=self.lead,
                activity_type=ActivityType.VENDOR_QUOTE_UPLOADED,
            ).exists(),
        )

    def test_salesperson_cannot_view_other_lead_pricing(self):
        other_lead = Lead.objects.create(
            customer_name="Other",
            category=self.category,
            stage=self.stage,
            assigned_to=self.other_sales,
        )
        PricingRequest.objects.create(
            lead=other_lead,
            token=PricingRequest.generate_token(),
            requested_by=self.other_sales,
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get(f"/api/v1/pricing/leads/{other_lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pricing_metrics(self):
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.RESPONDED,
            responded_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/pricing/metrics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["total_pricing_requests"], 1)

    def test_cannot_resubmit_responded_request(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.RESPONDED,
            responded_at=timezone.now(),
        )
        with self.assertRaises(ValueError):
            submit_pricing_response(
                pricing_request,
                line_items_data=[
                    {
                        "lead_item_id": str(self.lead_item.id),
                        "unit_price": "100",
                        "remarks": "",
                    }
                ],
            )
