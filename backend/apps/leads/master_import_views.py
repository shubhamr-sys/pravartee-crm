"""
Bulk product CSV import API views.
"""
from django.http import HttpResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedCRMUser

from .product_import import EXAMPLE_CSV, import_products_from_csv


class ProductBulkUploadView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {"detail": "Upload a CSV file using the 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not upload.name.lower().endswith(".csv"):
            return Response(
                {"detail": "Only .csv files are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if upload.size > 1_048_576:
            return Response(
                {"detail": "CSV file must be 1 MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = import_products_from_csv(upload)
        response_status = (
            status.HTTP_201_CREATED
            if result.processed_rows and not result.errors
            else status.HTTP_200_OK
            if result.processed_rows
            else status.HTTP_400_BAD_REQUEST
        )
        payload = result.as_dict()
        if result.processed_rows:
            payload["message"] = "Product import completed."
        else:
            payload["message"] = "No rows were imported. Fix the CSV and try again."
        return Response(payload, status=response_status)


class ProductBulkUploadExampleView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        response = HttpResponse(EXAMPLE_CSV, content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = (
            'attachment; filename="product-bulk-upload-example.csv"'
        )
        return response
