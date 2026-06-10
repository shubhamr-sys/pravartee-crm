from rest_framework import serializers

from apps.accounts.access import user_can_access_lead
from apps.leads.followup_services import sync_lead_next_followup_date
from apps.leads.models import FollowUp, FollowUpStatus, FollowUpType, Lead, StageHistory


class FollowUpSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name",
        read_only=True,
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name",
        read_only=True,
    )
    followup_type_display = serializers.CharField(
        source="get_followup_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = FollowUp
        fields = [
            "id",
            "lead",
            "assigned_to",
            "assigned_to_name",
            "followup_date",
            "followup_type",
            "followup_type_display",
            "remarks",
            "status",
            "status_display",
            "completed_at",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "lead",
            "status",
            "completed_at",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate_followup_type(self, value):
        if value not in FollowUpType.values:
            raise serializers.ValidationError("Invalid follow-up type.")
        return value


class FollowUpCreateSerializer(FollowUpSerializer):
    class Meta(FollowUpSerializer.Meta):
        read_only_fields = [
            "id",
            "lead",
            "status",
            "completed_at",
            "created_by",
            "created_at",
            "updated_at",
            "assigned_to_name",
            "created_by_name",
            "followup_type_display",
            "status_display",
        ]


class FollowUpUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUp
        fields = [
            "assigned_to",
            "followup_date",
            "followup_type",
            "remarks",
            "status",
        ]

    def validate_status(self, value):
        if value not in FollowUpStatus.values:
            raise serializers.ValidationError("Invalid status.")
        return value

    def update(self, instance, validated_data):
        new_status = validated_data.get("status")
        if new_status == FollowUpStatus.COMPLETED and not instance.completed_at:
            from django.utils import timezone

            instance.completed_at = timezone.now()
        followup = super().update(instance, validated_data)
        sync_lead_next_followup_date(followup.lead)
        return followup


class StageHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(
        source="changed_by.get_full_name",
        read_only=True,
    )

    class Meta:
        model = StageHistory
        fields = [
            "id",
            "lead",
            "old_stage",
            "new_stage",
            "remarks",
            "changed_by",
            "changed_by_name",
            "changed_at",
        ]
        read_only_fields = fields
