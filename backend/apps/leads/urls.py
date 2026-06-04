from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import (
    LeadDetailView,
    LeadListCreateView,
    LeadStageViewSet,
    ProductCategoryViewSet,
)

app_name = "leads"

router = DefaultRouter()
router.register("categories", ProductCategoryViewSet, basename="category")
router.register("stages", LeadStageViewSet, basename="stage")

urlpatterns = [
    path("", LeadListCreateView.as_view(), name="lead-list"),
    path("<uuid:pk>/", LeadDetailView.as_view(), name="lead-detail"),
] + router.urls
