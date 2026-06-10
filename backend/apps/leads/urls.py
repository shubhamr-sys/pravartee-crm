from django.urls import path
from rest_framework.routers import DefaultRouter

from .master_views import (
    BrandMasterViewSet,
    ProductMasterViewSet,
    ProductModelMasterViewSet,
)
from .views import (
    LeadAskForPriceView,
    LeadDetailView,
    LeadListCreateView,
    LeadStageViewSet,
    LeadSummaryView,
    ProductCategoryViewSet,
)

app_name = "leads"

router = DefaultRouter()
router.register("categories", ProductCategoryViewSet, basename="category")
router.register("stages", LeadStageViewSet, basename="stage")
router.register("masters/products", ProductMasterViewSet, basename="master-product")
router.register("masters/brands", BrandMasterViewSet, basename="master-brand")
router.register("masters/models", ProductModelMasterViewSet, basename="master-model")

urlpatterns = [
    path("", LeadListCreateView.as_view(), name="lead-list"),
    path("summary/", LeadSummaryView.as_view(), name="lead-summary"),
    path("<uuid:pk>/ask-for-price/", LeadAskForPriceView.as_view(), name="lead-ask-for-price"),
    path("<uuid:pk>/", LeadDetailView.as_view(), name="lead-detail"),
] + router.urls
