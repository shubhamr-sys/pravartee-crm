"""
Lead document upload helpers.
"""
import os

from apps.leads.categories import PRODUCT_CATEGORIES
from apps.leads.models import Lead, SOLUTION_CATEGORY_NAME

MAX_LEAD_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_LEAD_DOCUMENT_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".jpg",
    ".jpeg",
    ".png",
}


def lead_has_solution_items(lead: Lead) -> bool:
    return lead.items.filter(category__name=SOLUTION_CATEGORY_NAME).exists()


def validate_lead_document_upload(lead: Lead, uploaded_file) -> None:
    if SOLUTION_CATEGORY_NAME not in PRODUCT_CATEGORIES:
        raise ValueError("Solution category is not configured.")

    if not lead_has_solution_items(lead):
        raise ValueError(
            "Documents can only be uploaded when the lead has Solution category products.",
        )

    if not uploaded_file:
        raise ValueError("Choose a file to upload.")

    filename = getattr(uploaded_file, "name", "") or ""
    extension = os.path.splitext(filename)[1].lower()
    if extension not in ALLOWED_LEAD_DOCUMENT_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_LEAD_DOCUMENT_EXTENSIONS))
        raise ValueError(f"Unsupported file type. Allowed: {allowed}.")

    size = getattr(uploaded_file, "size", 0) or 0
    if size > MAX_LEAD_DOCUMENT_SIZE_BYTES:
        raise ValueError("Document must be 5 MB or smaller.")
