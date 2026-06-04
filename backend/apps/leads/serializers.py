from rest_framework import serializers

from .models import Lead, LeadStage, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class LeadStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadStage
        fields = ["id", "name", "sequence", "created_at"]
        read_only_fields = ["id", "created_at"]


class LeadSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "customer_name",
            "company_name",
            "contact_person",
            "phone",
            "email",
            "estimated_value",
            "lead_source",
            "next_followup_date",
            "notes",
            "assigned_to",
            "assigned_to_name",
            "category",
            "category_name",
            "stage",
            "stage_name",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return str(obj.assigned_to)
        return None
