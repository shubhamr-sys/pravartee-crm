"""
Pricing request serializers.
"""
from rest_framework import serializers

from apps.leads.models import LeadItem
from apps.pricing.models import PricingRequest, PricingResponseLineItem


class PricingLineItemReadSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True, allow_null=True)
    model_name = serializers.CharField(
        source="product_model.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = LeadItem
        fields = [
            "id",
            "category_name",
            "product_name",
            "brand_name",
            "model_name",
            "quantity",
            "uom",
            "specification",
            "remarks",
        ]


class PricingResponseLineItemSerializer(serializers.ModelSerializer):
    lead_item_id = serializers.UUIDField(source="lead_item.id", read_only=True)
    category_name = serializers.CharField(source="lead_item.category.name", read_only=True)
    product_name = serializers.CharField(source="lead_item.product.name", read_only=True)
    brand_name = serializers.CharField(
        source="lead_item.brand.name",
        read_only=True,
        allow_null=True,
    )
    model_name = serializers.CharField(
        source="lead_item.product_model.name",
        read_only=True,
        allow_null=True,
    )
    quantity = serializers.IntegerField(source="lead_item.quantity", read_only=True)
    specification = serializers.CharField(source="lead_item.specification", read_only=True)

    class Meta:
        model = PricingResponseLineItem
        fields = [
            "id",
            "lead_item_id",
            "category_name",
            "product_name",
            "brand_name",
            "model_name",
            "quantity",
            "specification",
            "unit_price",
            "remarks",
        ]


class PricingRequestListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    vendor_quote_url = serializers.SerializerMethodField()
    generated_quotation_url = serializers.SerializerMethodField()
    line_items = PricingResponseLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = PricingRequest
        fields = [
            "id",
            "lead",
            "status",
            "status_display",
            "requested_by",
            "requested_by_name",
            "requested_at",
            "responded_at",
            "submission_mode",
            "response_remarks",
            "vendor_quote_url",
            "generated_quotation_url",
            "line_items",
        ]
        read_only_fields = fields

    def get_requested_by_name(self, obj):
        if obj.requested_by_id:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return None

    def _file_url(self, file_field):
        if not file_field:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(file_field.url)
        return file_field.url

    def get_vendor_quote_url(self, obj):
        return self._file_url(obj.vendor_quote_pdf)

    def get_generated_quotation_url(self, obj):
        return self._file_url(obj.generated_quotation_pdf)


class PricingRequestDetailSerializer(PricingRequestListSerializer):
    lead_line_items = PricingLineItemReadSerializer(
        source="lead.items",
        many=True,
        read_only=True,
    )

    class Meta(PricingRequestListSerializer.Meta):
        fields = PricingRequestListSerializer.Meta.fields + [
            "lead_line_items",
            "token",
        ]


class PublicPricingRequestSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="lead.customer_name", read_only=True)
    company_name = serializers.CharField(source="lead.company_name", read_only=True)
    stage_name = serializers.CharField(source="lead.stage.name", read_only=True)
    line_items = PricingLineItemReadSerializer(source="lead.items", many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PricingRequest
        fields = [
            "id",
            "status",
            "status_display",
            "customer_name",
            "company_name",
            "stage_name",
            "requested_at",
            "responded_at",
            "line_items",
        ]
        read_only_fields = fields


class PublicPricingSubmitSerializer(serializers.Serializer):
    response_remarks = serializers.CharField(required=False, allow_blank=True, default="")
    line_items = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        allow_empty=False,
    )

    def validate_line_items(self, value):
        if not value:
            raise serializers.ValidationError("Enter at least one unit price.")
        priced = [
            row
            for row in value
            if row.get("unit_price") not in (None, "")
        ]
        if not priced:
            raise serializers.ValidationError("Enter at least one unit price.")
        return value
