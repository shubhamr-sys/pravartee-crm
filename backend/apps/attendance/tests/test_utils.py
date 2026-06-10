"""
Tests for attendance utilities: status, formatting, and map links.
"""
from decimal import Decimal

from django.test import TestCase

from apps.attendance.utils import (
    AttendanceStatus,
    format_working_hours_display,
    get_maps_url,
    get_record_status,
)


class MockRecord:
    def __init__(self, punch_in_time=None, punch_out_time=None, attendance_date=None):
        self.punch_in_time = punch_in_time
        self.punch_out_time = punch_out_time
        self.attendance_date = attendance_date


class AttendanceUtilsTestCase(TestCase):
    def test_status_absent_when_no_record(self):
        self.assertEqual(get_record_status(None), AttendanceStatus.ABSENT)

    def test_status_in_progress_when_punched_in_only_today(self):
        from datetime import date

        record = MockRecord(punch_in_time="2026-06-08T09:00:00Z")
        record.attendance_date = date.today()
        self.assertEqual(get_record_status(record), AttendanceStatus.IN_PROGRESS)

    def test_status_incomplete_when_past_day_without_punch_out(self):
        from datetime import date, timedelta

        record = MockRecord(punch_in_time="2026-06-07T09:00:00Z")
        record.attendance_date = date.today() - timedelta(days=1)
        self.assertEqual(get_record_status(record), AttendanceStatus.INCOMPLETE)

    def test_status_present_when_completed(self):
        record = MockRecord(
            punch_in_time="2026-06-08T09:00:00Z",
            punch_out_time="2026-06-08T18:00:00Z",
        )
        self.assertEqual(get_record_status(record), AttendanceStatus.PRESENT)

    def test_format_working_hours_display(self):
        self.assertEqual(format_working_hours_display(Decimal("8.50")), "8h 30m")
        self.assertEqual(format_working_hours_display(Decimal("9.25")), "9h 15m")
        self.assertEqual(format_working_hours_display(Decimal("0.01")), "0h 1m")
        self.assertEqual(format_working_hours_display(None), "—")

    def test_get_maps_url(self):
        url = get_maps_url(Decimal("28.626976"), Decimal("77.371919"))
        self.assertEqual(url, "https://maps.google.com/?q=28.626976,77.371919")

    def test_get_maps_url_returns_none_without_coordinates(self):
        self.assertIsNone(get_maps_url(None, None))
