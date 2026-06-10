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
        ("Pipeline Product Quantity", summary["pipeline_product_quantity"]),
        ("Won Product Quantity", summary["won_product_quantity"]),
        (
            "Average Products per Won Deal",
            summary.get("average_products_per_won_deal", 0),
        ),
        ("Win Rate (%)", summary.get("win_rate", 0)),
    ]
    for label, value in summary_rows:
        ws.cell(row=row, column=1, value=label)
        ws.cell(row=row, column=2, value=value)
        row += 1
    row += 1

    row = _write_section_title(ws, row, "Sales Pipeline by Stage")
    stage_data = [
        [item["stage"], item["count"], item.get("percentage", 0)]
        for item in report["pipeline_by_stage"]
    ]
    row = _write_table(
        ws,
        row,
        ["Stage", "Count", "Percentage (%)"],
        stage_data,
    )

    row = _write_section_title(ws, row, "Category Analysis")
    category_data = [
        [
            item["category"],
            item["lead_count"],
            item["product_quantity"],
            item["pipeline_share_percentage"],
        ]
        for item in report.get("category_analysis", [])
    ]
    row = _write_table(
        ws,
        row,
        ["Category", "Lead Count", "Product Quantity", "Pipeline Share (%)"],
        category_data,
    )

    row = _write_section_title(ws, row, "Top Products")
    product_data = [
        [item["product"], item["quantity"], item["lead_count"]]
        for item in report.get("top_products", [])
    ]
    row = _write_table(
        ws,
        row,
        ["Product", "Quantity", "Lead Count"],
        product_data,
    )

    row = _write_section_title(ws, row, "Salesperson Performance")
    sp_data = [
        [
            item["user"],
            item.get("assigned_leads", item["leads_managed"]),
            item["won_deals"],
            item["lost_deals"],
            item.get("win_rate", item["conversion_rate"]),
            item.get("followups_completed", 0),
        ]
        for item in report["salesperson_performance"]
    ]
    row = _write_table(
        ws,
        row,
        [
            "User",
            "Assigned Leads",
            "Won",
            "Lost",
            "Conversion (%)",
            "Follow-ups Completed",
        ],
        sp_data,
    )

    followups = report.get("follow_up_analysis", {})
    if followups:
        row = _write_section_title(ws, row, "Follow-up Analysis")
        followup_rows = [
            ("Today's Follow-ups", followups.get("today_followups", 0)),
            ("Overdue Follow-ups", followups.get("overdue_followups", 0)),
            ("Completed Follow-ups", followups.get("completed_followups", 0)),
        ]
        for label, value in followup_rows:
            ws.cell(row=row, column=1, value=label)
            ws.cell(row=row, column=2, value=value)
            row += 1
        row += 1

    row = _write_section_title(ws, row, "Top Customers")
    customer_data = [
        [
            item["customer"],
            item["company"],
            item["product_quantity"],
            item["stage"],
        ]
        for item in report["top_customers"]
    ]
    row = _write_table(
        ws,
        row,
        ["Customer", "Company", "Product Quantity", "Stage"],
        customer_data,
    )

    products = report.get("products", {})
    if products:
        row = _write_section_title(ws, row, "Quantity by Product")
        qty_data = [
            [item["product"], item["category"], item["brand"], item["quantity"]]
            for item in products.get("quantity_by_product", [])
        ]
        row = _write_table(
            ws,
            row,
            ["Product", "Category", "Brand", "Quantity"],
            qty_data,
        )

    _auto_width(ws)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
