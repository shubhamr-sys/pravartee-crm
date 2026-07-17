from datetime import timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.utils import timezone
from rest_framework import serializers

from apps.attendance.utils import get_maps_url
from apps.activities.services import log_lead_created, log_lead_updated

from .assignment import user_can_assign_lead_to
from .lead_item_services import replace_lead_items, sync_lead_from_items
from .models import (
    Brand,
    BusinessSegment,
    Lead,
    LeadDocument,
    LeadItem,
    LeadStage,
    Product,
    ProductCategory,
    ProductModel,
    SOLUTION_CATEGORY_NAME,
)
from .stages import is_completed_lead

DUE_SOON_DAYS = 3
GUT_FEELING_VALUES = list(range(10, 101, 10))

from .phone_validation import validate_and_normalize_indian_mobile
GPS_QUANTIZE = Decimal("0.000001")


def _normalize_gps_coordinate(value) -> Decimal:
    return Decimal(str(value)).quantize(GPS_QUANTIZE, rounding=ROUND_HALF_UP)


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
        read_only_fields = ["created_at", "updated_at"]

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


class LeadDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadDocument
        fields = [
            "id",
            "original_filename",
            "file_url",
            "file_size",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return str(obj.uploaded_by)
        return None


class LeadSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    is_completed = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    followup_status = serializers.SerializerMethodField()
    has_pricing_response = serializers.SerializerMethodField()
    has_pending_pricing_request = serializers.SerializerMethodField()
    location_url = serializers.SerializerMethodField()
    items = LeadItemSerializer(many=True, required=False)
    documents = LeadDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Lead
        fields = [
            "id",
            "customer_name",
            "company_name",
            "contact_person",
            "phone",
            "email",
            "address",
            "latitude",
            "longitude",
            "location_url",
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
            "is_completed",
            "business_segment",
            "deal_value",
            "billed_amount",
            "gross_margin_amount",
            "expected_close_date",
            "lost_reason",
            "competitor",
            "recovery_action",
            "gut_feeling_percent",
            "is_active",
            "has_pricing_response",
            "has_pending_pricing_request",
            "items",
            "documents",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def _apply_business_segment(self, validated_data, instance=None):
        """Default segment from category when not explicitly provided."""
        if "business_segment" in validated_data and validated_data["business_segment"]:
            return
        category = validated_data.get("category")
        if category is None and instance is not None:
            category = instance.category
        if category is not None and getattr(category, "name", None) == SOLUTION_CATEGORY_NAME:
            validated_data["business_segment"] = BusinessSegment.SOLUTIONS
        elif "business_segment" not in validated_data:
            if instance is None:
                validated_data["business_segment"] = BusinessSegment.TRADING

    def get_is_completed(self, obj) -> bool:
        return is_completed_lead(obj)

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

    def get_has_pricing_response(self, obj):
        from apps.pricing.models import PricingRequestStatus, PricingResponseLineItem

        return PricingResponseLineItem.objects.filter(
            pricing_request__lead=obj,
            pricing_request__status=PricingRequestStatus.RESPONDED,
            unit_price__isnull=False,
        ).exists()

    def get_has_pending_pricing_request(self, obj):
        pending_requests = getattr(obj, "pending_pricing_requests", None)
        if pending_requests is not None:
            return len(pending_requests) > 0

        from apps.pricing.models import PricingRequestStatus

        return obj.pricing_requests.filter(status=PricingRequestStatus.PENDING).exists()

    def get_location_url(self, obj):
        return get_maps_url(obj.latitude, obj.longitude)

    def validate_latitude(self, value):
        if value in (None, ""):
            return None
        try:
            lat = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise serializers.ValidationError("Invalid latitude.") from exc
        if lat < -90 or lat > 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return _normalize_gps_coordinate(lat)

    def validate_longitude(self, value):
        if value in (None, ""):
            return None
        try:
            lng = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise serializers.ValidationError("Invalid longitude.") from exc
        if lng < -180 or lng > 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return _normalize_gps_coordinate(lng)

    def validate(self, attrs):
        if self.instance and is_completed_lead(self.instance):
            raise serializers.ValidationError(
                "Completed leads (Won or Lost) cannot be edited.",
            )

        latitude = attrs.get("latitude", getattr(self.instance, "latitude", None))
        longitude = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if (latitude is None) ^ (longitude is None):
            raise serializers.ValidationError(
                "Both latitude and longitude are required for GPS location.",
            )

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

    def validate_contact_person(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Contact person is required.")
        return str(value).strip()

    def validate_phone(self, value):
        try:
            return validate_and_normalize_indian_mobile(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_gut_feeling_percent(self, value):
        if value is None:
            return value
        if value not in GUT_FEELING_VALUES:
            raise serializers.ValidationError(
                "Gut feeling must be 10%–100% in steps of 10%.",
            )
        return value

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

        self._apply_business_segment(validated_data)
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        lead = super().create(validated_data)

        if items_data:
            replace_lead_items(lead, items_data)
        else:
            sync_lead_from_items(lead)

        resolved = lead.resolve_business_segment()
        if lead.business_segment != resolved:
            lead.business_segment = resolved
            lead.save(update_fields=["business_segment", "updated_at"])

        log_lead_created(lead, user)
        return lead

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        self._apply_business_segment(validated_data, instance=instance)

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        previous = Lead.objects.select_related("stage", "assigned_to").get(pk=instance.pk)
        lead = super().update(instance, validated_data)

        if items_data is not None:
            replace_lead_items(lead, items_data)
        elif lead.items.exists():
            sync_lead_from_items(lead)

        if "business_segment" not in self.initial_data:
            resolved = lead.resolve_business_segment()
            if lead.business_segment != resolved:
                lead.business_segment = resolved
                lead.save(update_fields=["business_segment", "updated_at"])

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
        if hasattr(instance, "documents"):
            representation["documents"] = LeadDocumentSerializer(
                instance.documents.select_related("uploaded_by").all(),
                many=True,
                context=self.context,
            ).data
        return representation
