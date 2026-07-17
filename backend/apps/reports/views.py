from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCEOOrSalesHead
from apps.reports.exporters import build_sales_mbr_workbook
from apps.reports.services import get_sales_mbr_report, parse_report_filters


class SalesMBRReportView(APIView):
    """Sales Monthly Business Review JSON report."""

    permission_classes = [IsCEOOrSalesHead]

    def get(self, request):
        try:
            year, month, salesperson_id, category_id = parse_report_filters(request)
            report = get_sales_mbr_report(
                user=request.user,
                year=year,
                month=month,
                salesperson_id=salesperson_id,
                category_id=category_id,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(report)


class SalesMBRExportView(APIView):
    """Export Sales MBR report as Excel."""

    permission_classes = [IsCEOOrSalesHead]

    def get(self, request):
        try:
            year, month, salesperson_id, category_id = parse_report_filters(request)
            report = get_sales_mbr_report(
                user=request.user,
                year=year,
                month=month,
                salesperson_id=salesperson_id,
                category_id=category_id,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        workbook = build_sales_mbr_workbook(report)
        month_name = report["filters"]["month_name"]
        filename = f"Sales_MBR_{month_name}_{year}.xlsx"
        return FileResponse(
            workbook,
            as_attachment=True,
            filename=filename,
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )
