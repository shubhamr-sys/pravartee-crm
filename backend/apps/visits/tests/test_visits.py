"""
Field visit check-in / check-out tests.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.visits.choices import VisitStatus
from apps.visits.models import FieldVisit

User = get_user_model()


@override_settings(FRONTEND_PUBLIC_URL="http://localhost:3034")
class FieldVisitTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ceo = User.objects.create_user(
            username="ceo_visit",
            email="ceo_visit@test.com",
            password="pass12345",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_visit",
            email="head_visit@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
            manager=cls.ceo,
        )
        cls.head_b = User.objects.create_user(
            username="head_b_visit",
            email="head_b_visit@test.com",
            password="pass12345",
            role=UserRole.SALES_HEAD,
            manager=cls.ceo,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_visit",
            email="sales_visit@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
            manager=cls.sales_head,
        )
        cls.other_sales = User.objects.create_user(
            username="other_visit",
            email="other_visit@test.com",
            password="pass12345",
            role=UserRole.SALESPERSON,
            manager=cls.head_b,
        )

    def setUp(self):
        self.client = APIClient()

    def test_salesperson_can_check_in_and_out(self):
        self.client.force_authenticate(user=self.salesperson)
        check_in = self.client.post(
            "/api/v1/visits/check-in/",
            {
                "department_name": "PWD Delhi",
                "contact_person": "Ramesh Kumar",
                "mobile": "9876543210",
                "designation": "Executive Engineer",
                "purpose": "Tender discussion",
                "latitude": 28.6139,
                "longitude": 77.2090,
            },
            format="json",
        )
        self.assertEqual(check_in.status_code, status.HTTP_201_CREATED)
        self.assertEqual(check_in.data["visit"]["status"], VisitStatus.IN_PROGRESS)
        self.assertEqual(check_in.data["visit"]["contact_person"], "Ramesh Kumar")
        self.assertEqual(len(check_in.data["visit"]["activities"]), 1)

        active = self.client.get("/api/v1/visits/active/")
        self.assertEqual(active.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(active.data["visit"])

        check_out = self.client.post(
            "/api/v1/visits/check-out/",
            {
                "latitude": 28.6140,
                "longitude": 77.2091,
                "notes": "Meeting done",
            },
            format="json",
        )
        self.assertEqual(check_out.status_code, status.HTTP_200_OK)
        self.assertEqual(check_out.data["visit"]["status"], VisitStatus.COMPLETED)
        self.assertIsNotNone(check_out.data["visit"]["duration_hours"])

    def test_cannot_check_in_twice_without_checkout(self):
        self.client.force_authenticate(user=self.salesperson)
        self.client.post(
            "/api/v1/visits/check-in/",
            {
                "department_name": "MHA",
                "contact_person": "Amit",
                "mobile": "9876543210",
                "latitude": 28.61,
                "longitude": 77.20,
            },
            format="json",
        )
        second = self.client.post(
            "/api/v1/visits/check-in/",
            {
                "department_name": "Another Dept",
                "contact_person": "Amit",
                "mobile": "9876543210",
                "latitude": 28.61,
                "longitude": 77.20,
            },
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sales_head_cannot_see_other_team_visits(self):
        FieldVisit.objects.create(
            user=self.other_sales,
            department_name="Other Team Dept",
            check_in_time=timezone.now(),
            check_in_latitude="28.600000",
            check_in_longitude="77.200000",
            status=VisitStatus.IN_PROGRESS,
        )
        FieldVisit.objects.create(
            user=self.salesperson,
            department_name="My Team Dept",
            check_in_time=timezone.now(),
            check_in_latitude="28.610000",
            check_in_longitude="77.210000",
            status=VisitStatus.IN_PROGRESS,
        )

        self.client.force_authenticate(user=self.sales_head)
        response = self.client.get("/api/v1/visits/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        departments = {item["department_name"] for item in response.data["results"]}
        self.assertIn("My Team Dept", departments)
        self.assertNotIn("Other Team Dept", departments)

    def test_ceo_sees_all_visits(self):
        FieldVisit.objects.create(
            user=self.salesperson,
            department_name="Visit A",
            check_in_time=timezone.now(),
            check_in_latitude="28.610000",
            check_in_longitude="77.210000",
        )
        self.client.force_authenticate(user=self.ceo)
        response = self.client.get("/api/v1/visits/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)
