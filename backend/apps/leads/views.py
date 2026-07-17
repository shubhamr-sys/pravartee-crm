from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.access import leads_for_user, user_can_access_lead
from apps.accounts.permissions import CanAccessLead, IsAuthenticatedCRMUser
from apps.pricing.models import PricingRequest, PricingRequestStatus
from apps.pricing.services import create_pricing_request

from .categories import PRODUCT_CATEGORIES
from .metrics import get_lead_list_metrics
from .models import Lead, LeadStage, ProductCategory
from .serializers import LeadSerializer, LeadStageSerializer, ProductCategorySerializer
from .stages import CLOSED_STAGES, is_completed_lead

RESPONDED_PRICING_PREFETCH = Prefetch(
    "pricing_requests",
    queryset=PricingRequest.objects.filter(
        status=PricingRequestStatus.RESPONDED,
    ).order_by("-responded_at"),
    to_attr="responded_pricing_requests",
)

PENDING_PRICING_PREFETCH = Prefetch(
    "pricing_requests",
    queryset=PricingRequest.objects.filter(
        status=PricingRequestStatus.PENDING,
    ),
    to_attr="pending_pricing_requests",
)


class ProductCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductCategory.objects.filter(
        name__in=PRODUCT_CATEGORIES,
    ).order_by("name")
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticatedCRMUser]


class LeadStageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LeadStage.objects.all()
    serializer_class = LeadStageSerializer
    permission_classes = [IsAuthenticatedCRMUser]


class LeadSummaryView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        return Response(get_lead_list_metrics(request.user))


class LeadListCreateView(generics.ListCreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticatedCRMUser, CanAccessLead]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        "stage": ["exact"],
        "category": ["exact"],
        "assigned_to": ["exact"],
        "is_active": ["exact"],
        "next_followup_date": ["exact", "gte", "lte"],
    }
    search_fields = [
        "customer_name",
        "company_name",
        "contact_person",
        "phone",
        "email",
    ]
    ordering_fields = [
        "customer_name",
        "company_name",
        "next_followup_date",
        "created_at",
        "updated_at",
    ]
    ordering = ["-updated_at"]

    def get_queryset(self):
        qs = leads_for_user(self.request.user).filter(is_active=True)
        pipeline = self.request.query_params.get("pipeline", "open")
        if pipeline == "completed":
            qs = qs.filter(stage__name__in=CLOSED_STAGES)
        else:
            qs = qs.exclude(stage__name__in=CLOSED_STAGES)
        return qs.prefetch_related(
            RESPONDED_PRICING_PREFETCH,
            PENDING_PRICING_PREFETCH,
            "items",
            "items__category",
            "items__product",
            "items__brand",
            "items__product_model",
            "documents",
            "documents__uploaded_by",
        )

    def perform_create(self, serializer):
        user = self.request.user
        assigned_to = serializer.validated_data.get("assigned_to")
        # Salesperson / Sales Head: default assignee to creator when none selected.
        if assigned_to is None and (user.is_salesperson or user.is_sales_head):
            serializer.save(assigned_to=user)
        else:
            serializer.save()


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticatedCRMUser, CanAccessLead]

    def get_queryset(self):
        # Unfiltered lookup so unauthorized access returns 403, not 404.
        return Lead.objects.select_related(
            "assigned_to",
            "category",
            "stage",
        ).prefetch_related(
            RESPONDED_PRICING_PREFETCH,
            PENDING_PRICING_PREFETCH,
            "items",
            "items__category",
            "items__product",
            "items__brand",
            "items__product_model",
            "documents",
            "documents__uploaded_by",
        )

    def perform_destroy(self, instance):
        if is_completed_lead(instance):
            raise PermissionDenied("Completed leads (Won or Lost) cannot be deleted.")
        if self.request.user.is_salesperson:
            raise PermissionDenied("Salespersons cannot delete leads.")
        instance.delete()

    def perform_update(self, serializer):
        if is_completed_lead(serializer.instance):
            raise PermissionDenied("Completed leads (Won or Lost) cannot be edited.")
        serializer.save()


class LeadAskForPriceView(APIView):
    permission_classes = [IsAuthenticatedCRMUser]

    def post(self, request, pk):
        lead = get_object_or_404(Lead.objects.all(), pk=pk)
        if not user_can_access_lead(request.user, lead):
            raise PermissionDenied("You do not have permission to access this lead.")
        try:
            pricing_request = create_pricing_request(lead, request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "message": "Pricing request created and notification sent.",
                "pricing_request_id": str(pricing_request.id),
                "token": pricing_request.token,
            },
            status=status.HTTP_201_CREATED,
        )
