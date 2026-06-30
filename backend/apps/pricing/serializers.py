"""
Pricing request serializers.
"""
from rest_framework import serializers

from apps.leads.models import LeadItem
from apps.pricing.models import PricingRequest, PricingRequestStatus, PricingResponseLineItem


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
    lead_item_id = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()
    model_name = serializers.SerializerMethodField()
    quantity = serializers.SerializerMethodField()
    specification = serializers.SerializerMethodField()

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

    def get_lead_item_id(self, obj):
        return str(obj.lead_item_id) if obj.lead_item_id else None

    def _from_lead_item(self, obj, attr: str, snapshot: str):
        if obj.lead_item_id:
            lead_item = obj.lead_item
            if attr == "category_name":
                return lead_item.category.name
            if attr == "product_name":
                return lead_item.product.name
            if attr == "brand_name":
                return lead_item.brand.name if lead_item.brand_id else None
            if attr == "model_name":
                return lead_item.product_model.name if lead_item.product_model_id else None
            if attr == "quantity":
                return lead_item.quantity
            if attr == "specification":
                return lead_item.specification
        value = getattr(obj, snapshot, None)
        if attr in ("brand_name", "model_name") and value == "":
            return None
        return value

    def get_category_name(self, obj):
        return self._from_lead_item(obj, "category_name", "category_name")

    def get_product_name(self, obj):
        return self._from_lead_item(obj, "product_name", "product_name")

    def get_brand_name(self, obj):
        return self._from_lead_item(obj, "brand_name", "brand_name")

    def get_model_name(self, obj):
        return self._from_lead_item(obj, "model_name", "model_name")

    def get_quantity(self, obj):
        return self._from_lead_item(obj, "quantity", "quantity")

    def get_specification(self, obj):
        return self._from_lead_item(obj, "specification", "specification")


class PricingRequestListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    vendor_quote_url = serializers.SerializerMethodField()
    generated_quotation_url = serializers.SerializerMethodField()
    line_items = serializers.SerializerMethodField()

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
            "price_validity",
            "vendor_quote_url",
            "generated_quotation_url",
            "line_items",
        ]
        read_only_fields = fields

    def get_requested_by_name(self, obj):
        if obj.requested_by_id:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return None

    def get_line_items(self, obj):
        response_items = list(obj.line_items.all())
        if response_items:
            return PricingResponseLineItemSerializer(response_items, many=True).data

        if obj.status != PricingRequestStatus.RESPONDED:
            return []

        # Legacy responses (e.g. vendor PDF only) may have no stored unit prices.
        rows = []
        for lead_item in obj.lead.items.all():
            rows.append(
                {
                    "id": str(lead_item.id),
                    "lead_item_id": str(lead_item.id),
                    "category_name": lead_item.category.name,
                    "product_name": lead_item.product.name,
                    "brand_name": lead_item.brand.name if lead_item.brand_id else None,
                    "model_name": (
                        lead_item.product_model.name if lead_item.product_model_id else None
                    ),
                    "quantity": lead_item.quantity,
                    "specification": lead_item.specification,
                    "unit_price": None,
                    "remarks": "",
                }
            )
        return rows

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
            "price_validity",
            "line_items",
        ]
        read_only_fields = fields


class PricingQueueSerializer(serializers.ModelSerializer):
    """Pricing request card for the commercial team dashboard."""

    customer_name = serializers.CharField(source="lead.customer_name", read_only=True)
    company_name = serializers.CharField(source="lead.company_name", read_only=True)
    stage_name = serializers.CharField(source="lead.stage.name", read_only=True)
    record_type_display = serializers.CharField(
        source="lead.get_record_type_display",
        read_only=True,
    )
    address = serializers.CharField(source="lead.address", read_only=True)
    latitude = serializers.DecimalField(
        source="lead.latitude",
        max_digits=9,
        decimal_places=6,
        read_only=True,
        allow_null=True,
    )
    longitude = serializers.DecimalField(
        source="lead.longitude",
        max_digits=9,
        decimal_places=6,
        read_only=True,
        allow_null=True,
    )
    location_url = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    line_items = PricingLineItemReadSerializer(source="lead.items", many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    response_line_items = serializers.SerializerMethodField()

    class Meta:
        model = PricingRequest
        fields = [
            "id",
            "status",
            "status_display",
            "customer_name",
            "company_name",
            "stage_name",
            "record_type_display",
            "address",
            "latitude",
            "longitude",
            "location_url",
            "requested_by_name",
            "assigned_to_name",
            "requested_at",
            "responded_at",
            "submission_mode",
            "response_remarks",
            "price_validity",
            "line_items",
            "response_line_items",
        ]
        read_only_fields = fields

    def get_location_url(self, obj):
        from apps.attendance.utils import get_maps_url

        return get_maps_url(obj.lead.latitude, obj.lead.longitude)

    def get_requested_by_name(self, obj):
        if obj.requested_by_id:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return None

    def get_assigned_to_name(self, obj):
        assignee = obj.lead.assigned_to
        if assignee:
            return assignee.get_full_name() or assignee.username
        return None

    def get_response_line_items(self, obj):
        response_items = list(obj.line_items.all())
        if not response_items:
            return []
        return PricingResponseLineItemSerializer(response_items, many=True).data


class PublicPricingSubmitSerializer(serializers.Serializer):
    response_remarks = serializers.CharField(required=False, allow_blank=True, default="")
    price_validity = serializers.DateField(required=True)
    line_items = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        allow_empty=False,
    )

    def validate_line_items(self, value):
        if not value:
            raise serializers.ValidationError("Enter a unit price for every product line.")

        pricing_request = self.context.get("pricing_request")
        expected_ids = None
        if pricing_request is not None:
            expected_ids = {
                str(item_id)
                for item_id in pricing_request.lead.items.values_list("id", flat=True)
            }

        priced_ids: set[str] = set()
        for row in value:
            if row.get("unit_price") in (None, ""):
                continue
            lead_item_id = row.get("lead_item_id")
            if not lead_item_id:
                raise serializers.ValidationError("Each line must include lead_item_id.")
            priced_ids.add(str(lead_item_id))

        if not priced_ids:
            raise serializers.ValidationError("Enter a unit price for every product line.")

        if expected_ids is not None and priced_ids != expected_ids:
            raise serializers.ValidationError("Enter a unit price for every product line.")

        return value
