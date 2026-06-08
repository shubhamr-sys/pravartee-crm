"""
Excel export for Sales MBR reports (openpyxl).
"""
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

HEADER_FILL = PatternFill("solid", fgColor="0F766E")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
TITLE_FONT = Font(bold=True, size=14)
SECTION_FONT = Font(bold=True, size=12)


def _auto_width(ws):
    for column_cells in ws.columns:
        length = max(len(str(cell.value or "")) for cell in column_cells)
        ws.column_dimensions[get_column_letter(column_cells[0].column)].width = min(
            length + 2,
            40,
        )


def _write_section_title(ws, row: int, title: str) -> int:
    ws.cell(row=row, column=1, value=title).font = SECTION_FONT
    return row + 1


def _write_table(
    ws,
    row: int,
    headers: list[str],
    rows: list[list],
) -> int:
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=row, column=col, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center")
    row += 1
    for data_row in rows:
        for col, value in enumerate(data_row, start=1):
            ws.cell(row=row, column=col, value=value)
        row += 1
    return row + 1


def build_sales_mbr_workbook(report: dict) -> BytesIO:
    """Generate an Excel workbook matching the Sales MBR sheet layout."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Sales MBR"

    filters = report["filters"]
    summary = report["performance_summary"]
    title = f"Sales MBR — {filters['month_name']} {filters['year']}"

    ws.cell(row=1, column=1, value=title).font = TITLE_FONT
    row = 3

    row = _write_section_title(ws, row, "Sales Performance Summary")
    summary_rows = [
        ("Total Leads", summary["total_leads"]),
        ("Active Pipeline Leads", summary["active_pipeline_leads"]),
        ("Won Deals", summary["won_deals"]),
        ("Lost Deals", summary["lost_deals"]),
        ("Pipeline Value", float(summary["pipeline_value"])),
        ("Revenue", float(summary["revenue"])),
        ("Average Deal Size", float(summary["average_deal_size"])),
        ("Win Rate (%)", summary.get("win_rate", 0)),
    ]
    for label, value in summary_rows:
        ws.cell(row=row, column=1, value=label)
        ws.cell(row=row, column=2, value=value)
        row += 1
    row += 1

    row = _write_section_title(ws, row, "Pipeline by Stage")
    stage_data = [
        [
            item["stage"],
            item["count"],
            float(item["value"]),
        ]
        for item in report["pipeline_by_stage"]
    ]
    row = _write_table(
        ws,
        row,
        ["Stage", "Count", "Value"],
        stage_data,
    )

    row = _write_section_title(ws, row, "Top Customers")
    customer_data = [
        [
            item["customer"],
            item["company"],
            float(item["value"]),
            item["stage"],
        ]
        for item in report["top_customers"]
    ]
    row = _write_table(
        ws,
        row,
        ["Customer", "Company", "Value", "Stage"],
        customer_data,
    )

    row = _write_section_title(ws, row, "Salesperson Performance")
    sp_data = [
        [
            item["user"],
            item["leads_managed"],
            item["won_deals"],
            item["lost_deals"],
            float(item["pipeline_value"]),
            item.get("win_rate", item["conversion_rate"]),
        ]
        for item in report["salesperson_performance"]
    ]
    row = _write_table(
        ws,
        row,
        [
            "User",
            "Leads Managed",
            "Won Deals",
            "Lost Deals",
            "Pipeline Value",
            "Win Rate (%)",
        ],
        sp_data,
    )

    products = report.get("products", {})
    if products:
        row = _write_section_title(ws, row, "Quantity by Product")
        qty_data = [
            [item["product"], item["quantity"], float(item["revenue"])]
            for item in products.get("quantity_by_product", [])
        ]
        row = _write_table(ws, row, ["Product", "Quantity", "Revenue"], qty_data)

        row = _write_section_title(ws, row, "Revenue by Product")
        rev_product_data = [
            [item["product"], item["category"], float(item["revenue"])]
            for item in products.get("revenue_by_product", [])
        ]
        row = _write_table(
            ws,
            row,
            ["Product", "Category", "Revenue"],
            rev_product_data,
        )

        row = _write_section_title(ws, row, "Revenue by Category")
        rev_cat_data = [
            [item["category"], item["quantity"], float(item["revenue"])]
            for item in products.get("revenue_by_category", [])
        ]
        row = _write_table(
            ws,
            row,
            ["Category", "Quantity", "Revenue"],
            rev_cat_data,
        )

        row = _write_section_title(ws, row, "Revenue by Brand")
        rev_brand_data = [
            [item["brand"], item["quantity"], float(item["revenue"])]
            for item in products.get("revenue_by_brand", [])
        ]
        row = _write_table(
            ws,
            row,
            ["Brand", "Quantity", "Revenue"],
            rev_brand_data,
        )

        row = _write_section_title(ws, row, "Top Selling Products")
        top_data = [
            [item["product"], item["brand"], item["quantity"], float(item["revenue"])]
            for item in products.get("top_selling_products", [])
        ]
        _write_table(
            ws,
            row,
            ["Product", "Brand", "Quantity", "Revenue"],
            top_data,
        )

    _auto_width(ws)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
