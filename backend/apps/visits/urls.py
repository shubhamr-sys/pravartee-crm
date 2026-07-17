from django.urls import path

from .views import (
    ActiveVisitView,
    MyVisitListView,
    VisitCheckInView,
    VisitCheckOutView,
    VisitListView,
)

app_name = "visits"

urlpatterns = [
    path("", VisitListView.as_view(), name="visit-list"),
    path("me/", MyVisitListView.as_view(), name="my-visits"),
    path("active/", ActiveVisitView.as_view(), name="active-visit"),
    path("check-in/", VisitCheckInView.as_view(), name="visit-check-in"),
    path("check-out/", VisitCheckOutView.as_view(), name="visit-check-out"),
]
