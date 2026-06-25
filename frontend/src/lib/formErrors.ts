export function parseApiFieldErrors(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object") {
    return {};
  }

  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === "detail") continue;
    if (Array.isArray(value) && value.length > 0) {
      errors[key] = String(value[0]);
    } else if (typeof value === "string" && value.trim()) {
      errors[key] = value;
    }
  }

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    errors._form = detail;
  }

  return errors;
}

export function getValidationToastMessage(errors: Record<string, string>): string {
  const messages = Object.values(errors).filter(Boolean);
  if (messages.length === 0) {
    return "Please fix the highlighted fields.";
  }
  if (messages.length === 1) {
    return messages[0];
  }
  return `Please fix ${messages.length} validation errors.`;
}
