from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.access import leads_for_user
from apps.accounts.permissions import CanAccessLead, IsAuthenticatedCRMUser

from .categories import PRODUCT_CATEGORIES
from .metrics import get_lead_list_metrics
from .models import Lead, LeadStage, ProductCategory
from .serializers import LeadSerializer, LeadStageSerializer, ProductCategorySerializer


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
        "estimated_value",
        "next_followup_date",
        "created_at",
        "updated_at",
    ]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return leads_for_user(self.request.user).prefetch_related(
            "items",
            "items__category",
        )

    def perform_create(self, serializer):
        user = self.request.user
        assigned_to = serializer.validated_data.get("assigned_to")
        if user.is_salesperson and assigned_to is None:
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
        ).prefetch_related("items", "items__category")

    def perform_destroy(self, instance):
        if self.request.user.is_salesperson:
            raise PermissionDenied("Salespersons cannot delete leads.")
        instance.delete()
