from django.urls import path

from .views import (
    LeadPricingRequestListCreateView,
    PricingRequestDetailView,
    PricingRequestMetricsView,
    PublicPricingRequestView,
    PublicPricingSubmitView,
)

app_name = "pricing"

urlpatterns = [
    path("metrics/", PricingRequestMetricsView.as_view(), name="pricing-metrics"),
    path(
        "public/<str:token>/",
        PublicPricingRequestView.as_view(),
        name="public-pricing-detail",
    ),
    path(
        "public/<str:token>/submit/",
        PublicPricingSubmitView.as_view(),
        name="public-pricing-submit",
    ),
    path(
        "leads/<uuid:lead_id>/",
        LeadPricingRequestListCreateView.as_view(),
        name="lead-pricing-list",
    ),
    path(
        "<uuid:pk>/",
        PricingRequestDetailView.as_view(),
        name="pricing-detail",
    ),
]
