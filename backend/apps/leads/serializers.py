import re
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.activities.services import log_lead_created, log_lead_updated

from .assignment import user_can_assign_lead_to
from .models import Lead, LeadStage, ProductCategory

DUE_SOON_DAYS = 3

PHONE_PATTERN = re.compile(r"^[\d\s+\-().]{7,20}$")


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
    followup_status = serializers.SerializerMethodField()

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
            "followup_status",
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

    def get_followup_status(self, obj):
        if not obj.next_followup_date:
            return "none"
        today = timezone.localdate()
        if obj.next_followup_date < today:
            return "overdue"
        if obj.next_followup_date <= today + timedelta(days=DUE_SOON_DAYS):
            return "due_soon"
        return "normal"

    def validate_phone(self, value):
        if value and not PHONE_PATTERN.match(value):
            raise serializers.ValidationError(
                "Enter a valid phone number (7–20 digits, spaces, +, -, (), . allowed).",
            )
        return value

    def validate_estimated_value(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Estimated value must be zero or greater.")
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("company_name", "").strip():
            raise serializers.ValidationError(
                {"company_name": "Company name is required."},
            )
        return attrs

    def validate_assigned_to(self, value):
        if value is None:
            return value

        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return value

        requester = request.user
        if not user_can_assign_lead_to(requester, value):
            if requester.is_salesperson:
                message = "Salespersons may only assign leads to themselves."
            elif requester.is_sales_head:
                message = (
                    "Sales Heads may only assign leads to themselves or salespersons."
                )
            else:
                message = (
                    "You may only assign leads to CEOs, Sales Heads, or salespersons."
                )
            raise serializers.ValidationError(message)
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        lead = super().create(validated_data)
        log_lead_created(lead, user)
        return lead

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        previous = Lead.objects.select_related("stage", "assigned_to").get(pk=instance.pk)
        lead = super().update(instance, validated_data)
        log_lead_updated(lead, user, previous)
        return lead
