from django.urls import path

from .views import LeadActivityListView

app_name = "activities"

urlpatterns = [
    path("", LeadActivityListView.as_view(), name="activity-list"),
    path("lead/<uuid:lead_id>/", LeadActivityListView.as_view(), name="activity-by-lead"),
]
