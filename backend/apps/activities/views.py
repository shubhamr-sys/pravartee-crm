from rest_framework import generics

from .models import LeadActivity
from .serializers import LeadActivitySerializer


class LeadActivityListView(generics.ListAPIView):
    serializer_class = LeadActivitySerializer

    def get_queryset(self):
        queryset = LeadActivity.objects.select_related("lead", "user")
        lead_id = self.kwargs.get("lead_id")
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        return queryset
