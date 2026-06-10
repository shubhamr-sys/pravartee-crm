from django.urls import path
from rest_framework.routers import DefaultRouter

from .master_views import (
    BrandMasterViewSet,
    ProductMasterViewSet,
    ProductModelMasterViewSet,
)
from .followup_views import (
    LeadFollowUpCompleteView,
    LeadFollowUpDetailView,
    LeadFollowUpListCreateView,
    LeadStageHistoryListView,
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
    path(
        "<uuid:lead_id>/follow-ups/",
        LeadFollowUpListCreateView.as_view(),
        name="lead-followup-list",
    ),
    path(
        "<uuid:lead_id>/follow-ups/<uuid:pk>/",
        LeadFollowUpDetailView.as_view(),
        name="lead-followup-detail",
    ),
    path(
        "<uuid:lead_id>/follow-ups/<uuid:pk>/complete/",
        LeadFollowUpCompleteView.as_view(),
        name="lead-followup-complete",
    ),
    path(
        "<uuid:lead_id>/stage-history/",
        LeadStageHistoryListView.as_view(),
        name="lead-stage-history",
    ),
    path("<uuid:pk>/ask-for-price/", LeadAskForPriceView.as_view(), name="lead-ask-for-price"),
    path("<uuid:pk>/", LeadDetailView.as_view(), name="lead-detail"),
] + router.urls
