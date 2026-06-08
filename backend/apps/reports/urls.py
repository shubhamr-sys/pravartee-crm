from django.urls import path

from apps.reports.views import SalesMBRExportView, SalesMBRReportView

app_name = "reports"

urlpatterns = [
    path("sales/", SalesMBRReportView.as_view(), name="sales-mbr"),
    path("sales/export/", SalesMBRExportView.as_view(), name="sales-mbr-export"),
]
