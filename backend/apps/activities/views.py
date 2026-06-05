from rest_framework import generics
from rest_framework.exceptions import PermissionDenied

from apps.accounts.access import activities_for_user, user_can_access_lead
from apps.accounts.permissions import CanAccessLeadActivity, IsAuthenticatedCRMUser
from apps.leads.models import Lead

from .models import LeadActivity
from .serializers import LeadActivitySerializer


class LeadActivityListView(generics.ListAPIView):
    serializer_class = LeadActivitySerializer
    permission_classes = [IsAuthenticatedCRMUser, CanAccessLeadActivity]

    def get_queryset(self):
        queryset = activities_for_user(self.request.user)
        lead_id = self.kwargs.get("lead_id")
        if lead_id:
            try:
                lead = Lead.objects.get(pk=lead_id)
            except Lead.DoesNotExist:
                return queryset.none()
            if not user_can_access_lead(self.request.user, lead):
                raise PermissionDenied(
                    "You do not have permission to view activities for this lead."
                )
            queryset = queryset.filter(lead_id=lead_id)
        return queryset
