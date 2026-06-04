from rest_framework import generics, viewsets

from .models import Lead, LeadStage, ProductCategory
from .serializers import LeadSerializer, LeadStageSerializer, ProductCategorySerializer


class ProductCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class LeadStageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LeadStage.objects.all()
    serializer_class = LeadStageSerializer


class LeadListCreateView(generics.ListCreateAPIView):
    queryset = Lead.objects.select_related("assigned_to", "category", "stage")
    serializer_class = LeadSerializer


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Lead.objects.select_related("assigned_to", "category", "stage")
    serializer_class = LeadSerializer
