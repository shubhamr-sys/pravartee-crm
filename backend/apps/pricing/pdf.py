"""
Quotation PDF generation for manual pricing responses.
"""
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.pricing.models import PricingRequest


def _money(value) -> str:
    if value is None:
        return "—"
    return f"₹{Decimal(value):,.2f}"


def _line_hierarchy(item) -> str:
    parts = [item.category.name, item.product.name]
    if item.brand_id:
        parts.append(item.brand.name)
    if item.product_model_id:
        parts.append(item.product_model.name)
    return " → ".join(parts)


def generate_quotation_pdf(pricing_request: PricingRequest) -> bytes:
    """Build a simple quotation PDF from pricing response line items."""
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
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")]),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
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
