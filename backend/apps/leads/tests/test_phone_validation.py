"""
Tests for Indian mobile phone validation.
"""
from django.test import TestCase

from apps.leads.phone_validation import (
    is_valid_indian_mobile,
    normalize_indian_mobile,
    validate_and_normalize_indian_mobile,
)


class PhoneValidationTestCase(TestCase):
    def test_normalize_strips_country_code(self):
        self.assertEqual(normalize_indian_mobile("+91 98765 43210"), "9876543210")

    def test_normalize_strips_leading_zero(self):
        self.assertEqual(normalize_indian_mobile("09876543210"), "9876543210")

    def test_valid_mobile(self):
        self.assertTrue(is_valid_indian_mobile("9876543210"))

    def test_invalid_landline_rejected(self):
        self.assertFalse(is_valid_indian_mobile("1234567890"))

    def test_validate_and_normalize(self):
        self.assertEqual(
            validate_and_normalize_indian_mobile("+919876543210"),
            "9876543210",
        )
