"""
Indian mobile number validation and normalization.
"""
import re

INDIAN_MOBILE_PATTERN = re.compile(r"^[6-9]\d{9}$")


def normalize_indian_mobile(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def is_valid_indian_mobile(value: str) -> bool:
    normalized = normalize_indian_mobile(value)
    return bool(INDIAN_MOBILE_PATTERN.match(normalized))


def validate_and_normalize_indian_mobile(value: str) -> str:
    if not value or not str(value).strip():
        raise ValueError("Mobile number is required.")
    normalized = normalize_indian_mobile(str(value).strip())
    if not INDIAN_MOBILE_PATTERN.match(normalized):
        raise ValueError(
            "Enter a valid 10-digit Indian mobile number (starting with 6–9).",
        )
    return normalized
