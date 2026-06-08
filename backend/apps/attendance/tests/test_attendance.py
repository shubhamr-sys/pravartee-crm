"""
Attendance punch-in/out, GPS, working hours, and RBAC tests.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.attendance.models import Attendance
from apps.attendance.services import calculate_working_hours

User = get_user_model()

GPS_PAYLOAD = {"latitude": "28.613900", "longitude": "77.209000"}
GPS_OUT_PAYLOAD = {"latitude": "28.614100", "longitude": "77.208500"}


class AttendanceAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ceo = User.objects.create_user(
            username="ceo_att",
            email="ceo_att@test.com",
            password="pass12345",
            first_name="CEO",
            last_name="Att",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_att",
            email="head_att@test.com",
            password="pass12345",
            first_name="Head",
            last_name="Att",
            role=UserRole.SALES_HEAD,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_att",
            email="sales_att@test.com",
            password="pass12345",
            first_name="Sales",
            last_name="Att",
            role=UserRole.SALESPERSON,
        )

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    # --- Punch In / Out ---

    def test_punch_in_creates_record_with_gps(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/attendance/punch-in/",
            GPS_PAYLOAD,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Punch in successful")
        self.assertIsNotNone(response.data["punch_in_time"])

        record = Attendance.objects.get(user=self.salesperson)
        self.assertEqual(str(record.punch_in_latitude), "28.613900")
        self.assertEqual(str(record.punch_in_longitude), "77.209000")
        self.assertIsNone(record.punch_out_time)

    def test_punch_in_accepts_high_precision_gps(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/attendance/punch-in/",
            {
                "latitude": 28.613938472912345,
                "longitude": 77.209012345678901,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        record = Attendance.objects.get(user=self.salesperson)
        self.assertEqual(str(record.punch_in_latitude), "28.613938")
        self.assertEqual(str(record.punch_in_longitude), "77.209012")

    def test_duplicate_punch_in_prevented(self):
        self._auth(self.salesperson)
        self.client.post("/api/v1/attendance/punch-in/", GPS_PAYLOAD, format="json")
        response = self.client.post(
            "/api/v1/attendance/punch-in/",
            GPS_PAYLOAD,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_punch_out_requires_punch_in(self):
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/attendance/punch-out/",
            GPS_OUT_PAYLOAD,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_punch_out_calculates_working_hours_and_stores_gps(self):
        self._auth(self.salesperson)
        self.client.post("/api/v1/attendance/punch-in/", GPS_PAYLOAD, format="json")

        record = Attendance.objects.get(user=self.salesperson)
        record.punch_in_time = timezone.now() - timedelta(hours=8, minutes=45)
        record.save(update_fields=["punch_in_time"])

        response = self.client.post(
            "/api/v1/attendance/punch-out/",
            GPS_OUT_PAYLOAD,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Punch out successful")
        self.assertAlmostEqual(float(response.data["working_hours"]), 8.75, places=1)

        record.refresh_from_db()
        self.assertEqual(str(record.punch_out_latitude), "28.614100")
        self.assertEqual(str(record.punch_out_longitude), "77.208500")
        self.assertIsNotNone(record.working_hours)

    def test_duplicate_punch_out_prevented(self):
        self._auth(self.salesperson)
        self.client.post("/api/v1/attendance/punch-in/", GPS_PAYLOAD, format="json")
        self.client.post("/api/v1/attendance/punch-out/", GPS_OUT_PAYLOAD, format="json")
        response = self.client.post(
            "/api/v1/attendance/punch-out/",
            GPS_OUT_PAYLOAD,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_working_hours_calculation(self):
        punch_in = timezone.now() - timedelta(hours=9, minutes=10)
        punch_out = timezone.now()
        hours = calculate_working_hours(punch_in, punch_out)
        self.assertGreaterEqual(hours, Decimal("9.00"))

    # --- My Attendance ---

    def test_my_attendance_returns_own_history(self):
        Attendance.objects.create(
            user=self.salesperson,
            attendance_date=timezone.localdate(),
            punch_in_time=timezone.now(),
            punch_in_latitude=Decimal("28.613900"),
            punch_in_longitude=Decimal("77.209000"),
        )
        self._auth(self.salesperson)
        response = self.client.get("/api/v1/attendance/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    # --- RBAC visibility ---

    def _create_attendance(self, user):
        return Attendance.objects.create(
            user=user,
            attendance_date=timezone.localdate(),
            punch_in_time=timezone.now(),
            punch_in_latitude=Decimal("28.613900"),
            punch_in_longitude=Decimal("77.209000"),
        )

    def test_ceo_sees_all_attendance(self):
        self._create_attendance(self.ceo)
        self._create_attendance(self.sales_head)
        self._create_attendance(self.salesperson)

        self._auth(self.ceo)
        response = self.client.get("/api/v1/attendance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_sales_head_cannot_see_ceo_attendance(self):
        self._create_attendance(self.ceo)
        self._create_attendance(self.sales_head)
        self._create_attendance(self.salesperson)

        self._auth(self.sales_head)
        response = self.client.get("/api/v1/attendance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        user_ids = {item["user"]["id"] for item in response.data["results"]}
        self.assertNotIn(str(self.ceo.id), user_ids)

    def test_salesperson_sees_only_own_attendance(self):
        self._create_attendance(self.ceo)
        self._create_attendance(self.sales_head)
        self._create_attendance(self.salesperson)

        self._auth(self.salesperson)
        response = self.client.get("/api/v1/attendance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["user"]["id"],
            str(self.salesperson.id),
        )

    def test_attendance_filter_by_role_for_ceo(self):
        self._create_attendance(self.ceo)
        self._create_attendance(self.salesperson)

        self._auth(self.ceo)
        response = self.client.get(
            "/api/v1/attendance/",
            {"user__role": UserRole.SALESPERSON},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    # --- Dashboard attendance metrics ---

    def test_ceo_dashboard_includes_attendance_metrics(self):
        self._create_attendance(self.salesperson)
        self._auth(self.ceo)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        attendance = response.data["attendance"]
        self.assertIn("present_today", attendance)
        self.assertIn("absent_today", attendance)
        self.assertIn("total_employees", attendance)
        self.assertIn("average_working_hours", attendance)

    def test_sales_head_dashboard_includes_team_attendance_metrics(self):
        self._create_attendance(self.salesperson)
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        attendance = response.data["attendance"]
        self.assertIn("team_present", attendance)
        self.assertIn("team_absent", attendance)
        self.assertIn("average_team_working_hours", attendance)

    def test_salesperson_dashboard_includes_today_status(self):
        self._create_attendance(self.salesperson)
        self._auth(self.salesperson)
        response = self.client.get("/api/v1/dashboard/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        attendance = response.data["attendance"]
        self.assertEqual(attendance["today_status"], "In Progress")

    def test_attendance_record_includes_status_and_map_urls(self):
        record = self._create_attendance(self.salesperson)
        record.punch_out_time = timezone.now()
        record.working_hours = Decimal("8.50")
        record.punch_out_latitude = Decimal("28.614100")
        record.punch_out_longitude = Decimal("77.208500")
        record.save()

        self._auth(self.ceo)
        response = self.client.get("/api/v1/attendance/")
        item = response.data["results"][0]
        self.assertEqual(item["status"], "Present")
        self.assertEqual(item["working_hours_display"], "8h 30m")
        self.assertIn("maps.google.com", item["punch_in_map_url"])
        self.assertIn("maps.google.com", item["punch_out_map_url"])

    def test_attendance_status_filter_in_progress(self):
        self._create_attendance(self.salesperson)
        self._auth(self.ceo)
        response = self.client.get(
            "/api/v1/attendance/",
            {"status": "in_progress"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["status"], "In Progress")

    def test_attendance_summary_endpoint(self):
        self._create_attendance(self.ceo)
        self._auth(self.ceo)
        response = self.client.get("/api/v1/attendance/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("present_today", response.data)
        self.assertIn("present_employees", response.data)
        self.assertIn("absent_employees", response.data)
        self.assertEqual(len(response.data["present_employees"]), 1)
        self.assertGreaterEqual(len(response.data["absent_employees"]), 1)

    def test_attendance_status_filter_punched_in(self):
        self._create_attendance(self.salesperson)
        self._auth(self.ceo)
        response = self.client.get(
            "/api/v1/attendance/",
            {"status": "punched_in"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_visible_attendance_users_for_sales_head_excludes_ceo(self):
        self._auth(self.sales_head)
        response = self.client.get("/api/v1/attendance/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_ids = {item["id"] for item in response.data}
        self.assertIn(str(self.sales_head.id), user_ids)
        self.assertIn(str(self.salesperson.id), user_ids)
        self.assertNotIn(str(self.ceo.id), user_ids)
