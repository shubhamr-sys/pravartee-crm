from django.urls import path

from .views import (
    AssignableUserListView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RefreshTokenView,
)

app_name = "auth"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="me"),
    path("users/", AssignableUserListView.as_view(), name="assignable-users"),
]
