"""
Pricing request API views.
"""
import json

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.access import user_can_access_lead
from apps.accounts.permissions import IsAuthenticatedCRMUser, IsCommercial
from apps.leads.models import Lead
from apps.pricing.access import pricing_queue_queryset, pricing_requests_for_user
from apps.pricing.queue_filters import apply_pricing_queue_filters
from apps.pricing.models import PricingRequest, PricingRequestStatus
from apps.pricing.serializers import (
    PricingQueueSerializer,
    PricingRequestDetailSerializer,
    PricingRequestListSerializer,
    PublicPricingRequestSerializer,
    PublicPricingSubmitSerializer,
)
from apps.pricing.services import create_pricing_request, get_pricing_metrics, submit_pricing_response


class PricingQueueListView(generics.ListAPIView):
    """Commercial team dashboard — all pricing requests as cards."""

    permission_classes = [IsAuthenticatedCRMUser, IsCommercial]
    serializer_class = PricingQueueSerializer
    pagination_class = None

    def get_queryset(self):
        qs = pricing_queue_queryset()
        status_filter = self.request.query_params.get("status", "").upper()
        if status_filter in PricingRequestStatus.values:
            qs = qs.filter(status=status_filter)
        try:
            return apply_pricing_queue_filters(
                qs,
                search=self.request.query_params.get("search", ""),
                assigned_to=self.request.query_params.get("assigned_to", ""),
                requested_on=self.request.query_params.get("requested_on", ""),
                order=self.request.query_params.get("order", "-requested_at"),
            )
        except ValueError as exc:
            raise ValidationError({"requested_on": str(exc)}) from exc


class PricingQueueOwnersView(APIView):
    """Distinct sales owners on leads with pricing requests (for filter dropdown)."""

    permission_classes = [IsAuthenticatedCRMUser, IsCommercial]

    def get(self, request):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        owner_ids = (
            pricing_queue_queryset()
            .filter(lead__assigned_to__isnull=False)
            .values_list("lead__assigned_to_id", flat=True)
            .distinct()
        )
        owners = User.objects.filter(id__in=owner_ids).order_by(
            "last_name",
            "first_name",
            "username",
        )
        data = [
            {
                "id": str(user.id),
                "name": user.get_full_name() or user.username,
            }
            for user in owners
        ]
        return Response(data)


class PricingQueueDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticatedCRMUser, IsCommercial]
    serializer_class = PricingQueueSerializer

    def get_queryset(self):
        return pricing_queue_queryset()


class PricingQueueSubmitView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, IsCommercial]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        pricing_request = get_object_or_404(pricing_queue_queryset(), pk=pk)
        payload = _public_pricing_submit_payload(request)
        serializer = PublicPricingSubmitSerializer(
            data=payload,
            context={"pricing_request": pricing_request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            updated = submit_pricing_response(
                pricing_request,
                line_items_data=data.get("line_items"),
                response_remarks=data.get("response_remarks", ""),
                price_validity=data.get("price_validity"),
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(
            PricingQueueSerializer(updated).data,
            status=status.HTTP_200_OK,
        )


class PricingRequestMetricsView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        qs = pricing_requests_for_user(request.user)
        return Response(get_pricing_metrics(qs))


class LeadPricingRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedCRMUser]
    pagination_class = None

    def get_queryset(self):
        lead = get_object_or_404(Lead.objects.all(), pk=self.kwargs["lead_id"])
        if not user_can_access_lead(self.request.user, lead):
            raise PermissionDenied("You do not have permission to access this lead.")
        return pricing_requests_for_user(self.request.user).filter(lead=lead)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return PricingRequestListSerializer
        return PricingRequestDetailSerializer

    def create(self, request, *args, **kwargs):
        lead = get_object_or_404(Lead.objects.all(), pk=self.kwargs["lead_id"])
        if not user_can_access_lead(request.user, lead):
            raise PermissionDenied("You do not have permission to access this lead.")
        try:
            pricing_request = create_pricing_request(lead, request.user)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        serializer = PricingRequestDetailSerializer(
            pricing_request,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PricingRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticatedCRMUser]
    serializer_class = PricingRequestDetailSerializer

    def get_queryset(self):
        return pricing_requests_for_user(self.request.user)


class PublicPricingRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token):
        pricing_request = get_object_or_404(
            PricingRequest.objects.select_related("lead", "lead__stage").prefetch_related(
                "lead__items",
                "lead__items__category",
                "lead__items__product",
                "lead__items__brand",
                "lead__items__product_model",
            ),
            token=token,
        )
        serializer = PublicPricingRequestSerializer(pricing_request)
        return Response(serializer.data)


def _public_pricing_submit_payload(request):
    """
    Build a plain dict for serializer validation.

    QueryDict stores list values in a way that makes getlist() return nested
    lists (e.g. [[{...}]]), which breaks ListField validation after json.loads.
    """
    if hasattr(request.data, "get"):
        payload = {key: request.data.get(key) for key in request.data}
    else:
        payload = dict(request.data)

    line_items = payload.get("line_items")
    if line_items in ("", None):
        payload.pop("line_items", None)
    elif isinstance(line_items, str):
        try:
            payload["line_items"] = json.loads(line_items)
        except json.JSONDecodeError as exc:
            raise ValidationError({"line_items": "Invalid JSON."}) from exc
    return payload


class PublicPricingSubmitView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, token):
        pricing_request = get_object_or_404(PricingRequest, token=token)
        payload = _public_pricing_submit_payload(request)
        serializer = PublicPricingSubmitSerializer(
            data=payload,
            context={"pricing_request": pricing_request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            updated = submit_pricing_response(
                pricing_request,
                line_items_data=data.get("line_items"),
                response_remarks=data.get("response_remarks", ""),
                price_validity=data.get("price_validity"),
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(
            PublicPricingRequestSerializer(updated).data,
            status=status.HTTP_200_OK,
        )
