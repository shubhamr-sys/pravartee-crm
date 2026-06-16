from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/leads/", include("apps.leads.urls")),
    path("api/v1/activities/", include("apps.activities.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
    path("api/v1/attendance/", include("apps.attendance.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/pricing/", include("apps.pricing.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
