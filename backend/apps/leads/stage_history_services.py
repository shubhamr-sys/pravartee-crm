"""
Lead stage history recording.
"""
from django.contrib.auth import get_user_model

from apps.leads.models import Lead, StageHistory

User = get_user_model()


def log_stage_history(
    lead: Lead,
    user: User | None,
    old_stage: str,
    new_stage: str,
    remarks: str = "",
) -> StageHistory | None:
    if old_stage == new_stage:
        return None
    return StageHistory.objects.create(
        lead=lead,
        old_stage=old_stage,
        new_stage=new_stage,
        remarks=remarks,
        changed_by=user,
    )
