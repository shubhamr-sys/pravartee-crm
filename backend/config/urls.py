"""
Root URL configuration for Pravartee CRM.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/leads/", include("apps.leads.urls")),
    path("api/v1/activities/", include("apps.activities.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
]
