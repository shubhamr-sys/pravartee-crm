from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from apps.accounts.serializers import UserProfileSerializer

from .models import Attendance
from .utils import format_working_hours_display, get_maps_url, get_record_status

GPS_QUANTIZE = Decimal("0.000001")


def normalize_gps_coordinate(value) -> Decimal:
    return Decimal(str(value)).quantize(GPS_QUANTIZE, rounding=ROUND_HALF_UP)


class GPSInputSerializer(serializers.Serializer):
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


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_role = serializers.CharField(source="user.role", read_only=True)
    user = UserProfileSerializer(read_only=True)
    status = serializers.SerializerMethodField()
    working_hours_display = serializers.SerializerMethodField()
    punch_in_map_url = serializers.SerializerMethodField()
    punch_out_map_url = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            "id",
            "user",
            "employee_name",
            "employee_role",
            "status",
            "attendance_date",
            "punch_in_time",
            "punch_out_time",
            "punch_in_latitude",
            "punch_in_longitude",
            "punch_out_latitude",
            "punch_out_longitude",
            "punch_in_map_url",
            "punch_out_map_url",
            "working_hours",
            "working_hours_display",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_employee_name(self, obj):
        return obj.user.get_full_name()

    def get_status(self, obj):
        return get_record_status(obj)

    def get_working_hours_display(self, obj):
        return format_working_hours_display(obj.working_hours)

    def get_punch_in_map_url(self, obj):
        return get_maps_url(obj.punch_in_latitude, obj.punch_in_longitude)

    def get_punch_out_map_url(self, obj):
        return get_maps_url(obj.punch_out_latitude, obj.punch_out_longitude)
