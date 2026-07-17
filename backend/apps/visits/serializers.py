from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from apps.accounts.serializers import UserProfileSerializer
from apps.attendance.utils import get_maps_url
from apps.visits.models import FieldVisit, VisitActivity

GPS_QUANTIZE = Decimal("0.000001")


def normalize_gps_coordinate(value) -> Decimal:
    return Decimal(str(value)).quantize(GPS_QUANTIZE, rounding=ROUND_HALF_UP)


class VisitGPSInputSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return normalize_gps_coordinate(value)

    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return normalize_gps_coordinate(value)


class VisitCheckInSerializer(VisitGPSInputSerializer):
    department_name = serializers.CharField(max_length=255)
    contact_person = serializers.CharField(max_length=255)
    mobile = serializers.CharField(max_length=20)
    designation = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
    )
    purpose = serializers.CharField(required=False, allow_blank=True, default="")


class VisitCheckOutSerializer(VisitGPSInputSerializer):
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class VisitActivitySerializer(serializers.ModelSerializer):
    activity_label = serializers.CharField(
        source="get_activity_type_display",
        read_only=True,
    )
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = VisitActivity
        fields = [
            "id",
            "activity_type",
            "activity_label",
            "comments",
            "user",
            "user_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.user_id:
            return obj.user.get_full_name() or obj.user.username
        return None


class FieldVisitSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    check_in_map_url = serializers.SerializerMethodField()
    check_out_map_url = serializers.SerializerMethodField()
    activities = VisitActivitySerializer(many=True, read_only=True)

    class Meta:
        model = FieldVisit
        fields = [
            "id",
            "user",
            "employee_name",
            "department_name",
            "contact_person",
            "mobile",
            "designation",
            "purpose",
            "status",
            "status_display",
            "check_in_time",
            "check_out_time",
            "check_in_latitude",
            "check_in_longitude",
            "check_out_latitude",
            "check_out_longitude",
            "check_in_map_url",
            "check_out_map_url",
            "duration_hours",
            "notes",
            "activities",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_check_in_map_url(self, obj):
        return get_maps_url(obj.check_in_latitude, obj.check_in_longitude)

    def get_check_out_map_url(self, obj):
        return get_maps_url(obj.check_out_latitude, obj.check_out_longitude)
