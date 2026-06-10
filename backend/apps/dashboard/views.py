from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuthenticatedCRMUser

from .services import get_dashboard_summary


class DashboardSummaryView(APIView):
    """CRM dashboard metrics scoped by user role."""

    permission_classes = [IsAuthenticatedCRMUser]

    def get(self, request):
        return Response(get_dashboard_summary(user=request.user))
