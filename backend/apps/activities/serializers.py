from rest_framework import serializers

from .models import LeadActivity


class LeadActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadActivity
        fields = [
            "id",
            "lead",
            "user",
            "user_name",
            "activity_type",
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
