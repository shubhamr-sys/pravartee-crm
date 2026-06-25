from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.access import followups_for_user, user_can_access_lead
from apps.accounts.permissions import CanAccessLead, IsAuthenticatedCRMUser
from apps.activities.services import (
    log_followup_completed,
    log_followup_modified,
    log_followup_scheduled,
)
from apps.leads.followup_serializers import (
    FollowUpCompleteSerializer,
    FollowUpCreateSerializer,
    FollowUpSerializer,
    FollowUpUpdateSerializer,
    StageHistorySerializer,
)
from apps.leads.followup_services import order_followups_for_display, sync_lead_next_followup_date
from apps.leads.models import FollowUp, FollowUpStatus, Lead, StageHistory


def _get_accessible_lead(user, lead_id):
    lead = get_object_or_404(Lead.objects.all(), pk=lead_id)
    if not user_can_access_lead(user, lead):
        raise PermissionDenied("You do not have permission to access this lead.")
    return lead


class LeadFollowUpListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessLead]
    pagination_class = None

    def get_lead(self):
        return _get_accessible_lead(self.request.user, self.kwargs["lead_id"])

    def get_queryset(self):
        lead = self.get_lead()
        return order_followups_for_display(
            followups_for_user(self.request.user).filter(lead=lead)
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return FollowUpCreateSerializer
        return FollowUpSerializer

    def perform_create(self, serializer):
        lead = self.get_lead()
        previous_next_date = lead.next_followup_date
        assigned_to = serializer.validated_data.get("assigned_to")
        if assigned_to is None:
            assigned_to = lead.assigned_to or self.request.user
        followup = serializer.save(
            lead=lead,
            assigned_to=assigned_to,
            created_by=self.request.user,
            status=FollowUpStatus.PENDING,
        )
        sync_lead_next_followup_date(lead)
        log_followup_scheduled(followup, self.request.user, previous_next_date)


class LeadFollowUpDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessLead]

    def get_lead(self):
        return _get_accessible_lead(self.request.user, self.kwargs["lead_id"])

    def get_queryset(self):
        lead = self.get_lead()
        return order_followups_for_display(
            followups_for_user(self.request.user).filter(lead=lead)
        )

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return FollowUpUpdateSerializer
        return FollowUpSerializer


class LeadFollowUpCompleteView(APIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessLead]

    def post(self, request, lead_id, pk):
        lead = _get_accessible_lead(request.user, lead_id)
        followup = get_object_or_404(
            followups_for_user(request.user).filter(lead=lead),
            pk=pk,
        )
        if followup.status == FollowUpStatus.COMPLETED:
            return Response(
                {"detail": "Follow-up is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = FollowUpCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        followup.remarks = serializer.validated_data["remarks"]
        followup.action_taken = serializer.validated_data["action_taken"]
        followup.status = FollowUpStatus.COMPLETED
        followup.completed_at = timezone.now()
        followup.save(
            update_fields=[
                "remarks",
                "action_taken",
                "status",
                "completed_at",
                "updated_at",
            ]
        )
        sync_lead_next_followup_date(lead)
        log_followup_completed(followup, request.user)
        return Response(FollowUpSerializer(followup).data)


class LeadStageHistoryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticatedCRMUser, CanAccessLead]
    serializer_class = StageHistorySerializer
    pagination_class = None

    def get_queryset(self):
        lead = _get_accessible_lead(self.request.user, self.kwargs["lead_id"])
        return StageHistory.objects.filter(lead=lead).select_related("changed_by")
