from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from apps.accounts.serializers import UserProfileSerializer

from .choices import CorrectionType
from .models import Attendance, AttendanceActivity, AttendanceCorrectionRequest
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


class AttendanceActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    activity_label = serializers.CharField(source="get_activity_type_display", read_only=True)

    class Meta:
        model = AttendanceActivity
        fields = [
            "id",
            "attendance",
            "user",
            "user_name",
            "activity_type",
            "activity_label",
            "old_value",
            "new_value",
            "comments",
            "created_at",
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None


class AttendanceCorrectionRequestSerializer(serializers.ModelSerializer):
    requested_by_user = UserProfileSerializer(source="requested_by", read_only=True)
    approved_by_user = UserProfileSerializer(source="approved_by", read_only=True)
    attendance_date = serializers.DateField(source="attendance.attendance_date", read_only=True)
    employee_name = serializers.SerializerMethodField()
    correction_type_label = serializers.CharField(
        source="get_correction_type_display",
        read_only=True,
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    can_approve = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceCorrectionRequest
        fields = [
            "id",
            "attendance",
            "attendance_date",
            "employee_name",
            "requested_by",
            "requested_by_user",
            "correction_type",
            "correction_type_label",
            "requested_punch_in_time",
            "requested_punch_out_time",
            "reason",
            "status",
            "status_label",
            "approved_by",
            "approved_by_user",
            "approved_at",
            "rejection_reason",
            "can_approve",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "status",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def get_employee_name(self, obj):
        return obj.attendance.user.get_full_name()

    def get_can_approve(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        from apps.attendance.access import user_can_approve_correction

        return user_can_approve_correction(request.user, obj)


class AttendanceCorrectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceCorrectionRequest
        fields = [
            "attendance",
            "correction_type",
            "requested_punch_in_time",
            "requested_punch_out_time",
            "reason",
        ]

    def validate_correction_type(self, value):
        if value not in CorrectionType.values:
            raise serializers.ValidationError("Invalid correction type.")
        return value

    def validate(self, attrs):
        attendance = attrs.get("attendance")
        correction_type = attrs.get("correction_type")
        request = self.context["request"]

        if attendance.user_id != request.user.pk:
            raise serializers.ValidationError(
                {"attendance": "You can only request corrections for your own attendance."},
            )

        if correction_type == CorrectionType.MISSED_PUNCH_OUT:
            if not attrs.get("requested_punch_out_time"):
                raise serializers.ValidationError(
                    {"requested_punch_out_time": "Required for missed punch out."},
                )
        if correction_type == CorrectionType.ACCIDENTAL_PUNCH_OUT:
            if not attendance.punch_out_time:
                raise serializers.ValidationError(
                    {"correction_type": "No punch out exists to correct."},
                )
        return attrs

    def create(self, validated_data):
        from apps.attendance.correction_services import create_correction_request

        request = self.context["request"]
        return create_correction_request(
            user=request.user,
            attendance=validated_data["attendance"],
            correction_type=validated_data["correction_type"],
            reason=validated_data["reason"],
            requested_punch_in_time=validated_data.get("requested_punch_in_time"),
            requested_punch_out_time=validated_data.get("requested_punch_out_time"),
        )


class RejectCorrectionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")
