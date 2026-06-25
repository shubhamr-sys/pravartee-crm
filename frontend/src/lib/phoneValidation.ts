const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function normalizeIndianMobile(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE_PATTERN.test(normalizeIndianMobile(value));
}

export function validateIndianMobile(value: string): string | null {
  if (!value.trim()) {
    return "Mobile number is required.";
  }
  if (!isValidIndianMobile(value)) {
    return "Enter a valid 10-digit Indian mobile number (starting with 6–9).";
  }
  return null;
}
