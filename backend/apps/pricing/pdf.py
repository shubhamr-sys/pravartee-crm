"""
Quotation PDF generation for manual pricing responses.
"""
from decimal import Decimal
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.pricing.models import PricingRequest

_BODY_FONT = "Helvetica"
_BOLD_FONT = "Helvetica-Bold"
_CURRENCY_PREFIX = "Rs. "
_FONTS_READY = False


def _ensure_pdf_fonts() -> None:
    """Register a Unicode font when available so ₹ and → render correctly."""
    global _BODY_FONT, _BOLD_FONT, _CURRENCY_PREFIX, _FONTS_READY
    if _FONTS_READY:
        return
    _FONTS_READY = True

    candidates = [
        (
            Path(__file__).resolve().parent / "fonts" / "DejaVuSans.ttf",
            Path(__file__).resolve().parent / "fonts" / "DejaVuSans-Bold.ttf",
        ),
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ),
    ]
    for regular_path, bold_path in candidates:
        if regular_path.is_file() and bold_path.is_file():
            pdfmetrics.registerFont(TTFont("DejaVuSans", str(regular_path)))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(bold_path)))
            _BODY_FONT = "DejaVuSans"
            _BOLD_FONT = "DejaVuSans-Bold"
            _CURRENCY_PREFIX = "₹"
            return


def _money(value) -> str:
    _ensure_pdf_fonts()
    if value is None:
        return "—"
    return f"{_CURRENCY_PREFIX}{Decimal(value):,.2f}"


def _line_hierarchy(item) -> str:
    parts = [item.category.name, item.product.name]
    if item.brand_id:
        parts.append(item.brand.name)
    if item.product_model_id:
        parts.append(item.product_model.name)
    return " → ".join(parts)


def generate_quotation_pdf(pricing_request: PricingRequest) -> bytes:
    """Build a simple quotation PDF from pricing response line items."""
    _ensure_pdf_fonts()
    lead = pricing_request.lead
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Pravartee Sales — Quotation", styles["Title"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"<b>Project:</b> {lead.customer_name}", styles["Normal"]))
    story.append(Paragraph(f"<b>Company:</b> {lead.company_name or '—'}", styles["Normal"]))
    story.append(Paragraph(f"<b>Stage:</b> {lead.stage.name}", styles["Normal"]))
    story.append(Spacer(1, 12))

    table_data = [
        ["Product", "Qty", "Unit Price", "Line Total", "Remarks"],
    ]
    grand_total = Decimal("0")

    line_items = pricing_request.line_items.select_related(
        "lead_item",
        "lead_item__category",
        "lead_item__product",
        "lead_item__brand",
        "lead_item__product_model",
    )

    for row in line_items:
        item = row.lead_item
        qty = item.quantity
        unit = row.unit_price or Decimal("0")
        line_total = unit * qty
        grand_total += line_total
        table_data.append(
            [
                _line_hierarchy(item),
                str(qty),
                _money(unit),
                _money(line_total),
                row.remarks or "",
            ]
        )

    table_data.append(["", "", "Grand Total", _money(grand_total), ""])

    table = Table(table_data, colWidths=[70 * mm, 15 * mm, 25 * mm, 25 * mm, 45 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), _BODY_FONT),
                ("FONTNAME", (0, 0), (-1, 0), _BOLD_FONT),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")]),
                ("FONTNAME", (0, -1), (-1, -1), _BOLD_FONT),
            ]
        )
    )
    story.append(table)

    if pricing_request.response_remarks:
        story.append(Spacer(1, 12))
        story.append(Paragraph("<b>Remarks:</b>", styles["Normal"]))
        story.append(Paragraph(pricing_request.response_remarks, styles["Normal"]))

    doc.build(story)
    return buffer.getvalue()
