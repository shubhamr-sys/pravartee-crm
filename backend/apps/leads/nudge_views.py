"""
CEO-triggered follow-up nudge emails.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCEO
from apps.leads.nudge_emails import send_all_assignee_nudge_emails


class LeadNudgeEmailsView(APIView):
    """Send follow-up nudge emails to all eligible lead assignees."""

    permission_classes = [IsCEO]

    def post(self, request):
        dry_run = bool(request.data.get("dry_run", False))
        stats = send_all_assignee_nudge_emails(dry_run=dry_run)
        payload = stats.as_dict()
        if stats.errors:
            return Response(payload, status=status.HTTP_207_MULTI_STATUS)
        return Response(payload, status=status.HTTP_200_OK)
