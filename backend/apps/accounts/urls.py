from django.urls import path

from .user_management_views import (
    UserActivateView,
    UserDeactivateView,
    UserManagementDetailView,
    UserManagementListCreateView,
    UserResetPasswordView,
)
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
    path("manage/users/", UserManagementListCreateView.as_view(), name="manage-users"),
    path(
        "manage/users/<uuid:pk>/",
        UserManagementDetailView.as_view(),
        name="manage-user-detail",
    ),
    path(
        "manage/users/<uuid:pk>/activate/",
        UserActivateView.as_view(),
        name="manage-user-activate",
    ),
    path(
        "manage/users/<uuid:pk>/deactivate/",
        UserDeactivateView.as_view(),
        name="manage-user-deactivate",
    ),
    path(
        "manage/users/<uuid:pk>/reset-password/",
        UserResetPasswordView.as_view(),
        name="manage-user-reset-password",
    ),
]
