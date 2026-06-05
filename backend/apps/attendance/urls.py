from django.urls import path

from .views import (
    AttendanceActivityListView,
    AttendanceListView,
    AttendanceSummaryView,
    CorrectionApproveView,
    CorrectionDetailView,
    CorrectionListCreateView,
    CorrectionRejectView,
    MyAttendanceListView,
    PunchInView,
    PunchOutView,
    VisibleAttendanceUsersView,
)

app_name = "attendance"

urlpatterns = [
    path("", AttendanceListView.as_view(), name="attendance-list"),
    path("me/", MyAttendanceListView.as_view(), name="my-attendance"),
    path("summary/", AttendanceSummaryView.as_view(), name="attendance-summary"),
    path("users/", VisibleAttendanceUsersView.as_view(), name="attendance-users"),
    path("punch-in/", PunchInView.as_view(), name="punch-in"),
    path("punch-out/", PunchOutView.as_view(), name="punch-out"),
    path("corrections/", CorrectionListCreateView.as_view(), name="correction-list"),
    path(
        "corrections/<uuid:pk>/",
        CorrectionDetailView.as_view(),
        name="correction-detail",
    ),
    path(
        "corrections/<uuid:pk>/approve/",
        CorrectionApproveView.as_view(),
        name="correction-approve",
    ),
    path(
        "corrections/<uuid:pk>/reject/",
        CorrectionRejectView.as_view(),
        name="correction-reject",
    ),
    path(
        "<uuid:attendance_id>/activities/",
        AttendanceActivityListView.as_view(),
        name="attendance-activities",
    ),
]
