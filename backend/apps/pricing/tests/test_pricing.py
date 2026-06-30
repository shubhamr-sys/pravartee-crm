"""
Pricing request workflow tests.
"""
import json
from datetime import datetime
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
    PRICE_VALIDITY = "2026-12-31"

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
        cls.commercial = User.objects.create_user(
            username="commercial_pricing",
            email="commercial_pricing@test.com",
            password="pass12345",
            role=UserRole.COMMERCIAL,
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
                "price_validity": self.PRICE_VALIDITY,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pricing_request.refresh_from_db()
        self.assertEqual(pricing_request.status, PricingRequestStatus.RESPONDED)
        self.assertEqual(str(pricing_request.price_validity), self.PRICE_VALIDITY)
        self.assertFalse(pricing_request.generated_quotation_pdf)
        line_item = pricing_request.line_items.get()
        self.assertEqual(line_item.unit_price, Decimal("50000.00"))
        self.assertEqual(line_item.product_name, "Laptop")
        self.assertTrue(
            LeadActivity.objects.filter(
                lead=self.lead,
                activity_type=ActivityType.PRICING_RESPONSE_RECEIVED,
            ).exists(),
        )
        self.assertEqual(len(mail.outbox), 1)

    def test_lead_includes_has_pricing_response_after_response(self):
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
                "price_validity": self.PRICE_VALIDITY,
            },
            format="json",
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get(f"/api/v1/leads/{self.lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_pricing_response"])

    def test_lead_pricing_list_includes_line_item_prices(self):
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
                "price_validity": self.PRICE_VALIDITY,
            },
            format="json",
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get(f"/api/v1/pricing/leads/{self.lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["line_items"]), 1)
        self.assertEqual(response.data[0]["line_items"][0]["unit_price"], "50000.00")

    def test_lead_pricing_list_legacy_responded_without_prices_shows_lead_items(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.RESPONDED,
            response_remarks="JSK",
            responded_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get(f"/api/v1/pricing/leads/{self.lead.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["line_items"]), 1)
        self.assertIsNone(response.data[0]["line_items"][0]["unit_price"])
        self.assertEqual(response.data[0]["line_items"][0]["product_name"], "Laptop")

    def test_lead_edit_preserves_pricing_when_item_ids_sent(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
        )
        submit_response = self.client.post(
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
                "price_validity": self.PRICE_VALIDITY,
            },
            format="json",
        )
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.salesperson)
        edit_response = self.client.patch(
            f"/api/v1/leads/{self.lead.id}/",
            {
                "notes": "Updated after pricing",
                "items": [
                    {
                        "id": str(self.lead_item.id),
                        "category": str(self.category.id),
                        "product": str(self.product.id),
                        "brand": str(self.brand.id),
                        "model": str(self.model.id),
                        "quantity": 2,
                        "uom": "NOS",
                        "specification": "16GB RAM",
                        "remarks": "Urgent",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(edit_response.status_code, status.HTTP_200_OK)

        pricing_response = self.client.get(f"/api/v1/pricing/leads/{self.lead.id}/")
        self.assertEqual(pricing_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(pricing_response.data[0]["line_items"]), 1)
        self.assertEqual(
            pricing_response.data[0]["line_items"][0]["unit_price"],
            "50000.00",
        )

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
                "price_validity": self.PRICE_VALIDITY,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pricing_request.refresh_from_db()
        self.assertEqual(pricing_request.status, PricingRequestStatus.RESPONDED)

    def test_public_submit_requires_all_line_item_prices(self):
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
                        "unit_price": "",
                        "remarks": "",
                    }
                ],
                "response_remarks": "Missing price",
                "price_validity": self.PRICE_VALIDITY,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        pricing_request.refresh_from_db()
        self.assertEqual(pricing_request.status, PricingRequestStatus.PENDING)

    def test_public_submit_requires_line_item_prices(self):
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
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        pricing_request.refresh_from_db()
        self.assertEqual(pricing_request.status, PricingRequestStatus.PENDING)

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
                price_validity=timezone.now().date(),
            )

    def test_commercial_user_sees_pricing_queue(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.commercial)
        response = self.client.get("/api/v1/pricing/queue/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(pricing_request.id))
        self.assertEqual(response.data[0]["customer_name"], "Pricing Customer")
        self.assertEqual(len(response.data[0]["line_items"]), 1)

    def test_salesperson_cannot_access_pricing_queue(self):
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.salesperson)
        response = self.client.get("/api/v1/pricing/queue/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_commercial_user_submits_pricing_via_queue(self):
        pricing_request = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.commercial)
        response = self.client.post(
            f"/api/v1/pricing/queue/{pricing_request.id}/submit/",
            {
                "response_remarks": "Best vendor rates",
                "price_validity": self.PRICE_VALIDITY,
                "line_items": [
                    {
                        "lead_item_id": str(self.lead_item.id),
                        "unit_price": "45000.00",
                        "remarks": "Including GST",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pricing_request.refresh_from_db()
        self.assertEqual(pricing_request.status, PricingRequestStatus.RESPONDED)
        self.assertEqual(pricing_request.response_remarks, "Best vendor rates")
        self.assertEqual(str(pricing_request.price_validity), self.PRICE_VALIDITY)
        self.assertTrue(
            any("Pricing Response Received" in msg.subject for msg in mail.outbox),
        )

    def test_pricing_queue_filter_by_search(self):
        other_lead = Lead.objects.create(
            customer_name="Alpha Project",
            company_name="Alpha Ltd",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
        )
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        PricingRequest.objects.create(
            lead=other_lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.commercial)
        response = self.client.get("/api/v1/pricing/queue/", {"search": "Alpha"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["customer_name"], "Alpha Project")

    def test_pricing_queue_filter_by_sales_owner(self):
        other_lead = Lead.objects.create(
            customer_name="Other Owner Lead",
            category=self.category,
            stage=self.stage,
            assigned_to=self.other_sales,
        )
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        PricingRequest.objects.create(
            lead=other_lead,
            token=PricingRequest.generate_token(),
            requested_by=self.other_sales,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.commercial)
        response = self.client.get(
            "/api/v1/pricing/queue/",
            {"assigned_to": str(self.other_sales.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["customer_name"], "Other Owner Lead")

    def test_pricing_queue_filter_by_exact_date(self):
        older = PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        older.requested_at = timezone.make_aware(datetime(2026, 1, 10, 9, 0, 0))
        older.save(update_fields=["requested_at"])

        other_lead = Lead.objects.create(
            customer_name="Later Lead",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
        )
        newer = PricingRequest.objects.create(
            lead=other_lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        newer.requested_at = timezone.make_aware(datetime(2026, 1, 15, 9, 0, 0))
        newer.save(update_fields=["requested_at"])

        self.client.force_authenticate(user=self.commercial)
        response = self.client.get(
            "/api/v1/pricing/queue/",
            {"requested_on": "2026-01-10"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(older.id))

    def test_pricing_queue_invalid_date_returns_400(self):
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.commercial)
        response = self.client.get(
            "/api/v1/pricing/queue/",
            {"requested_on": "not-a-date"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pricing_queue_order_ascending(self):
        older_lead = Lead.objects.create(
            customer_name="Older Lead",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
        )
        newer_lead = Lead.objects.create(
            customer_name="Newer Lead",
            category=self.category,
            stage=self.stage,
            assigned_to=self.salesperson,
        )
        older = PricingRequest.objects.create(
            lead=older_lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        older.requested_at = timezone.make_aware(datetime(2026, 1, 1, 9, 0, 0))
        older.save(update_fields=["requested_at"])
        newer = PricingRequest.objects.create(
            lead=newer_lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        newer.requested_at = timezone.make_aware(datetime(2026, 1, 20, 9, 0, 0))
        newer.save(update_fields=["requested_at"])

        self.client.force_authenticate(user=self.commercial)
        response = self.client.get(
            "/api/v1/pricing/queue/",
            {"order": "requested_at"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["id"], str(older.id))
        self.assertEqual(response.data[1]["id"], str(newer.id))

    def test_pricing_queue_owners_endpoint(self):
        PricingRequest.objects.create(
            lead=self.lead,
            token=PricingRequest.generate_token(),
            requested_by=self.salesperson,
            status=PricingRequestStatus.PENDING,
        )
        self.client.force_authenticate(user=self.commercial)
        response = self.client.get("/api/v1/pricing/queue/owners/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.salesperson.id))
