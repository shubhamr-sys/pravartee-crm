from django.urls import path

from .views import (
    AttendanceListView,
    AttendanceSummaryView,
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
]
