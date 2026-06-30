from django.urls import path

from .views import (
    LeadPricingRequestListCreateView,
    PricingQueueDetailView,
    PricingQueueListView,
    PricingQueueOwnersView,
    PricingQueueSubmitView,
    PricingRequestDetailView,
    PricingRequestMetricsView,
    PublicPricingRequestView,
    PublicPricingSubmitView,
)

app_name = "pricing"

urlpatterns = [
    path("metrics/", PricingRequestMetricsView.as_view(), name="pricing-metrics"),
    path("queue/", PricingQueueListView.as_view(), name="pricing-queue-list"),
    path("queue/owners/", PricingQueueOwnersView.as_view(), name="pricing-queue-owners"),
    path(
        "queue/<uuid:pk>/",
        PricingQueueDetailView.as_view(),
        name="pricing-queue-detail",
    ),
    path(
        "queue/<uuid:pk>/submit/",
        PricingQueueSubmitView.as_view(),
        name="pricing-queue-submit",
    ),
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
