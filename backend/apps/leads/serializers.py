import re
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.activities.services import log_lead_created, log_lead_updated

from .assignment import user_can_assign_lead_to
from .lead_item_services import replace_lead_items, sync_lead_from_items
from .models import Brand, Lead, LeadItem, LeadStage, Product, ProductCategory, ProductModel

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


class LeadItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    brand_name = serializers.SerializerMethodField()
    model_name = serializers.SerializerMethodField()
    brand = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        required=False,
        allow_null=True,
    )
    model = serializers.PrimaryKeyRelatedField(
        source="product_model",
        queryset=ProductModel.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = LeadItem
        fields = [
            "id",
            "category",
            "category_name",
            "product",
            "product_name",
            "brand",
            "brand_name",
            "model",
            "model_name",
            "quantity",
            "uom",
            "specification",
            "remarks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand_id else ""

    def get_model_name(self, obj):
        return obj.product_model.name if obj.product_model_id else ""

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value

    def validate(self, attrs):
        category = attrs.get("category") or getattr(self.instance, "category", None)
        product = attrs.get("product") or getattr(self.instance, "product", None)
        brand = attrs.get("brand") or getattr(self.instance, "brand", None)
        product_model = attrs.get("product_model") or getattr(
            self.instance,
            "product_model",
            None,
        )

        if category and product and product.category_id != category.id:
            raise serializers.ValidationError(
                {"product": "Product must belong to the selected category."},
            )
        if product and brand and brand.product_id != product.id:
            raise serializers.ValidationError(
                {"brand": "Brand must belong to the selected product."},
            )
        if product_model and not brand:
            raise serializers.ValidationError(
                {"model": "Select a brand before selecting a model."},
            )
        if brand and product_model and product_model.brand_id != brand.id:
            raise serializers.ValidationError(
                {"model": "Model must belong to the selected brand."},
            )
        return attrs


class LeadSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    followup_status = serializers.SerializerMethodField()
    items = LeadItemSerializer(many=True, required=False)

    class Meta:
        model = Lead
        fields = [
            "id",
            "customer_name",
            "company_name",
            "contact_person",
            "phone",
            "email",
            "record_type",
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
            "items",
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

    def validate(self, attrs):
        items = self.initial_data.get("items")
        is_create = self.instance is None

        if is_create and not attrs.get("company_name", "").strip():
            raise serializers.ValidationError(
                {"company_name": "Company name is required."},
            )

        if is_create:
            has_items = isinstance(items, list) and len(items) > 0
            if not has_items and not attrs.get("category"):
                raise serializers.ValidationError(
                    {"items": "Add at least one product line item."},
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
        items_data = validated_data.pop("items", None)
        if items_data:
            first_category = items_data[0].get("category")
            if first_category:
                validated_data["category"] = first_category

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        lead = super().create(validated_data)

        if items_data:
            replace_lead_items(lead, items_data)
        else:
            sync_lead_from_items(lead)

        log_lead_created(lead, user)
        return lead

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        previous = Lead.objects.select_related("stage", "assigned_to").get(pk=instance.pk)
        lead = super().update(instance, validated_data)

        if items_data is not None:
            replace_lead_items(lead, items_data)
        elif lead.items.exists():
            sync_lead_from_items(lead)

        log_lead_updated(lead, user, previous)
        return lead

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if hasattr(instance, "items"):
            representation["items"] = LeadItemSerializer(
                instance.items.select_related(
                    "category",
                    "product",
                    "brand",
                    "product_model",
                ),
                many=True,
            ).data
        return representation
