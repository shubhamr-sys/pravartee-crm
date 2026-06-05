"""
Attendance correction request workflow tests.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.choices import UserRole
from apps.attendance.choices import AttendanceActivityType, CorrectionStatus, CorrectionType
from apps.attendance.models import Attendance, AttendanceActivity, AttendanceCorrectionRequest
from apps.attendance.utils import AttendanceStatus, get_record_status

User = get_user_model()


class AttendanceCorrectionTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ceo = User.objects.create_user(
            username="ceo_corr",
            email="ceo_corr@test.com",
            password="pass12345",
            first_name="CEO",
            last_name="Corr",
            role=UserRole.CEO,
        )
        cls.sales_head = User.objects.create_user(
            username="head_corr",
            email="head_corr@test.com",
            password="pass12345",
            first_name="Head",
            last_name="Corr",
            role=UserRole.SALES_HEAD,
        )
        cls.salesperson = User.objects.create_user(
            username="sales_corr",
            email="sales_corr@test.com",
            password="pass12345",
            first_name="Sales",
            last_name="Corr",
            role=UserRole.SALESPERSON,
        )

    def setUp(self):
        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _create_attendance(self, user, days_ago=0, with_punch_out=True):
        date = timezone.localdate() - timedelta(days=days_ago)
        punch_in = timezone.now() - timedelta(days=days_ago, hours=8)
        record = Attendance.objects.create(
            user=user,
            attendance_date=date,
            punch_in_time=punch_in,
            punch_in_latitude=Decimal("28.613900"),
            punch_in_longitude=Decimal("77.209000"),
        )
        if with_punch_out:
            punch_out = punch_in + timedelta(hours=3, minutes=5)
            record.punch_out_time = punch_out
            record.working_hours = Decimal("3.08")
            record.save()
        return record

    def test_incomplete_status_for_previous_day_without_punch_out(self):
        record = self._create_attendance(self.salesperson, days_ago=1, with_punch_out=False)
        self.assertEqual(get_record_status(record), AttendanceStatus.INCOMPLETE)

    def test_salesperson_creates_accidental_punch_out_correction(self):
        record = self._create_attendance(self.salesperson)
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/attendance/corrections/",
            {
                "attendance": str(record.id),
                "correction_type": CorrectionType.ACCIDENTAL_PUNCH_OUT,
                "reason": "Accidentally clicked Punch Out while using the CRM.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], CorrectionStatus.PENDING)

    def test_salesperson_creates_missed_punch_out_correction(self):
        record = self._create_attendance(
            self.salesperson,
            days_ago=1,
            with_punch_out=False,
        )
        requested_out = record.punch_in_time + timedelta(hours=9, minutes=30)
        self._auth(self.salesperson)
        response = self.client.post(
            "/api/v1/attendance/corrections/",
            {
                "attendance": str(record.id),
                "correction_type": CorrectionType.MISSED_PUNCH_OUT,
                "requested_punch_out_time": requested_out.isoformat(),
                "reason": "Forgot to punch out before leaving office.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_ceo_approves_accidental_punch_out_and_clears_punch_out(self):
        record = self._create_attendance(self.salesperson)
        correction = AttendanceCorrectionRequest.objects.create(
            attendance=record,
            requested_by=self.salesperson,
            correction_type=CorrectionType.ACCIDENTAL_PUNCH_OUT,
            reason="Accidental punch out",
            status=CorrectionStatus.PENDING,
        )

        self._auth(self.ceo)
        response = self.client.post(f"/api/v1/attendance/corrections/{correction.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], CorrectionStatus.APPROVED)

        record.refresh_from_db()
        self.assertIsNone(record.punch_out_time)
        self.assertIsNone(record.working_hours)
        self.assertTrue(
            AttendanceActivity.objects.filter(
                attendance=record,
                activity_type=AttendanceActivityType.CORRECTION_APPROVED,
            ).exists(),
        )

    def test_sales_head_approves_salesperson_missed_punch_out(self):
        record = self._create_attendance(
            self.salesperson,
            days_ago=1,
            with_punch_out=False,
        )
        requested_out = record.punch_in_time + timedelta(hours=9, minutes=30)
        correction = AttendanceCorrectionRequest.objects.create(
            attendance=record,
            requested_by=self.salesperson,
            correction_type=CorrectionType.MISSED_PUNCH_OUT,
            requested_punch_out_time=requested_out,
            reason="Missed punch out",
            status=CorrectionStatus.PENDING,
        )

        self._auth(self.sales_head)
        response = self.client.post(f"/api/v1/attendance/corrections/{correction.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        record.refresh_from_db()
        self.assertIsNotNone(record.punch_out_time)
        self.assertIsNotNone(record.working_hours)
        self.assertGreater(float(record.working_hours), 0)

    def test_sales_head_cannot_approve_ceo_correction(self):
        record = self._create_attendance(self.ceo)
        correction = AttendanceCorrectionRequest.objects.create(
            attendance=record,
            requested_by=self.ceo,
            correction_type=CorrectionType.ACCIDENTAL_PUNCH_OUT,
            reason="CEO accidental",
            status=CorrectionStatus.PENDING,
        )

        self._auth(self.sales_head)
        response = self.client.post(f"/api/v1/attendance/corrections/{correction.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_salesperson_cannot_approve_correction(self):
        record = self._create_attendance(self.salesperson)
        correction = AttendanceCorrectionRequest.objects.create(
            attendance=record,
            requested_by=self.salesperson,
            correction_type=CorrectionType.ACCIDENTAL_PUNCH_OUT,
            reason="Accidental",
            status=CorrectionStatus.PENDING,
        )

        self._auth(self.salesperson)
        response = self.client.post(f"/api/v1/attendance/corrections/{correction.id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reject_correction_leaves_attendance_unchanged(self):
        record = self._create_attendance(self.salesperson)
        original_punch_out = record.punch_out_time
        correction = AttendanceCorrectionRequest.objects.create(
            attendance=record,
            requested_by=self.salesperson,
            correction_type=CorrectionType.ACCIDENTAL_PUNCH_OUT,
            reason="Accidental",
            status=CorrectionStatus.PENDING,
        )

        self._auth(self.ceo)
        response = self.client.post(
            f"/api/v1/attendance/corrections/{correction.id}/reject/",
            {"rejection_reason": "Insufficient detail provided."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], CorrectionStatus.REJECTED)

        record.refresh_from_db()
        self.assertEqual(record.punch_out_time, original_punch_out)

    def test_sales_head_cannot_see_ceo_corrections(self):
        record = self._create_attendance(self.ceo)
        AttendanceCorrectionRequest.objects.create(
            attendance=record,
            requested_by=self.ceo,
            correction_type=CorrectionType.ACCIDENTAL_PUNCH_OUT,
            reason="CEO request",
            status=CorrectionStatus.PENDING,
        )
        AttendanceCorrectionRequest.objects.create(
            attendance=self._create_attendance(self.salesperson),
            requested_by=self.salesperson,
            correction_type=CorrectionType.ACCIDENTAL_PUNCH_OUT,
            reason="Sales request",
            status=CorrectionStatus.PENDING,
        )

        self._auth(self.sales_head)
        response = self.client.get("/api/v1/attendance/corrections/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_attendance_activities_timeline_after_punch_in(self):
        self._auth(self.salesperson)
        self.client.post(
            "/api/v1/attendance/punch-in/",
            {"latitude": 28.6139, "longitude": 77.2090},
            format="json",
        )
        record = Attendance.objects.get(user=self.salesperson)
        self._auth(self.ceo)
        response = self.client.get(f"/api/v1/attendance/{record.id}/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        types = {item["activity_type"] for item in response.data["results"]}
        self.assertIn(AttendanceActivityType.ATTENDANCE_CREATED, types)
        self.assertIn(AttendanceActivityType.PUNCH_IN_RECORDED, types)

    def test_dashboard_shows_pending_corrections_for_ceo(self):
        record = self._create_attendance(self.salesperson)
        AttendanceCorrectionRequest.objects.create(
            attendance=record,
            requested_by=self.salesperson,
            correction_type=CorrectionType.ACCIDENTAL_PUNCH_OUT,
            reason="Pending",
            status=CorrectionStatus.PENDING,
        )
        self._auth(self.ceo)
        response = self.client.get("/api/v1/attendance/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pending_corrections"], 1)
