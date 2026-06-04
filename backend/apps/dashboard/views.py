from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_dashboard_summary


class DashboardSummaryView(APIView):
    """
    CEO dashboard summary metrics.
    Role-based filtering will be added in a later iteration.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_dashboard_summary())
