"""
Lead document upload API views.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.access import user_can_access_lead
from apps.accounts.permissions import IsAuthenticatedCRMUser

from .document_services import validate_lead_document_upload
from .models import Lead, LeadDocument
from .serializers import LeadDocumentSerializer


class LeadDocumentListCreateView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]
    parser_classes = [MultiPartParser, FormParser]

    def _get_lead(self, request, lead_id):
        lead = get_object_or_404(
            Lead.objects.prefetch_related("items__category"),
            pk=lead_id,
        )
        if not user_can_access_lead(request.user, lead):
            raise PermissionDenied("You do not have permission to access this lead.")
        return lead

    def get(self, request, lead_id):
        lead = self._get_lead(request, lead_id)
        documents = lead.documents.select_related("uploaded_by").all()
        serializer = LeadDocumentSerializer(
            documents,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    def post(self, request, lead_id):
        lead = self._get_lead(request, lead_id)
        upload = request.FILES.get("file")
        try:
            validate_lead_document_upload(lead, upload)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        document = LeadDocument.objects.create(
            lead=lead,
            file=upload,
            original_filename=upload.name,
            file_size=upload.size,
            uploaded_by=request.user,
        )
        serializer = LeadDocumentSerializer(document, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LeadDocumentDetailView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def delete(self, request, lead_id, pk):
        lead = get_object_or_404(Lead, pk=lead_id)
        if not user_can_access_lead(request.user, lead):
            raise PermissionDenied("You do not have permission to access this lead.")

        document = get_object_or_404(LeadDocument, pk=pk, lead=lead)
        document.file.delete(save=False)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
