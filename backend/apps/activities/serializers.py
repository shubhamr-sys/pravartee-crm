from rest_framework import serializers

from .models import LeadActivity


class LeadActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()
    activity_label = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )
    description = serializers.SerializerMethodField()
    change_summary = serializers.SerializerMethodField()
    lead_customer_name = serializers.CharField(
        source="lead.customer_name",
        read_only=True,
    )
    lead_company_name = serializers.CharField(
        source="lead.company_name",
        read_only=True,
    )

    class Meta:
        model = LeadActivity
        fields = [
            "id",
            "lead",
            "lead_customer_name",
            "lead_company_name",
            "user",
            "user_name",
            "user_username",
            "activity_type",
            "activity_label",
            "description",
            "change_summary",
            "old_value",
            "new_value",
            "comments",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_user_name(self, obj):
        if obj.user:
            return str(obj.user)
        return None

    def get_user_username(self, obj):
        if obj.user:
            return obj.user.username
        return None

    def get_change_summary(self, obj):
        if obj.old_value and obj.new_value:
            return f"{obj.old_value} → {obj.new_value}"
        if obj.new_value:
            return obj.new_value
        return ""

    def get_description(self, obj):
        summary = self.get_change_summary(obj)
        if summary:
            return summary
        if obj.comments:
            return obj.comments
        return obj.get_activity_type_display()
