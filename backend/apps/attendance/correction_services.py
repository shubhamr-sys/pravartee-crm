"""
Attendance correction request and approval workflow.
"""
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.attendance.activity import log_attendance_activity
from apps.attendance.choices import (
    AttendanceActivityType,
    CorrectionStatus,
    CorrectionType,
)
from apps.attendance.models import Attendance, AttendanceCorrectionRequest
from apps.attendance.services import calculate_working_hours

User = get_user_model()


def _ensure_no_pending_request(attendance: Attendance) -> None:
    if attendance.correction_requests.filter(status=CorrectionStatus.PENDING).exists():
        raise ValidationError(
            "A pending correction request already exists for this attendance record.",
        )


def create_correction_request(
    user: User,
    attendance: Attendance,
    correction_type: str,
    reason: str,
    requested_punch_in_time=None,
    requested_punch_out_time=None,
) -> AttendanceCorrectionRequest:
    """Create a new attendance correction request for the user's attendance."""
    if attendance.user_id != user.pk and not user.is_ceo:
        raise PermissionDenied("You can only request corrections for your own attendance.")

    if not attendance.punch_in_time:
        raise ValidationError("Cannot request correction without a punch in record.")

    _ensure_no_pending_request(attendance)

    if correction_type == CorrectionType.MISSED_PUNCH_OUT and not requested_punch_out_time:
        raise ValidationError("Requested punch out time is required for missed punch out.")

    if correction_type == CorrectionType.ACCIDENTAL_PUNCH_OUT and not attendance.punch_out_time:
        raise ValidationError(
            "Accidental punch out correction requires an existing punch out.",
        )

    request_obj = AttendanceCorrectionRequest.objects.create(
        attendance=attendance,
        requested_by=user,
        correction_type=correction_type,
        requested_punch_in_time=requested_punch_in_time,
        requested_punch_out_time=requested_punch_out_time,
        reason=reason,
        status=CorrectionStatus.PENDING,
    )

    log_attendance_activity(
        attendance,
        AttendanceActivityType.CORRECTION_REQUESTED,
        user=user,
        comments=f"{correction_type}: {reason}",
        new_value=CorrectionStatus.PENDING,
    )
    return request_obj


def _apply_correction_to_attendance(
    correction: AttendanceCorrectionRequest,
) -> Attendance:
    attendance = correction.attendance
    old_punch_out = attendance.punch_out_time
    old_hours = attendance.working_hours

    if correction.correction_type == CorrectionType.ACCIDENTAL_PUNCH_OUT:
        attendance.punch_out_time = None
        attendance.punch_out_latitude = None
        attendance.punch_out_longitude = None
        attendance.working_hours = None
    elif correction.correction_type == CorrectionType.MISSED_PUNCH_OUT:
        punch_out = correction.requested_punch_out_time
        if not punch_out:
            raise ValidationError("Requested punch out time is missing.")
        if punch_out < attendance.punch_in_time:
            raise ValidationError("Requested punch out cannot be before punch in.")
        attendance.punch_out_time = punch_out
        attendance.working_hours = calculate_working_hours(
            attendance.punch_in_time,
            punch_out,
        )
    else:
        if correction.requested_punch_in_time:
            attendance.punch_in_time = correction.requested_punch_in_time
        if correction.requested_punch_out_time:
            attendance.punch_out_time = correction.requested_punch_out_time
        if attendance.punch_in_time and attendance.punch_out_time:
            if attendance.punch_out_time < attendance.punch_in_time:
                raise ValidationError("Punch out cannot be before punch in.")
            attendance.working_hours = calculate_working_hours(
                attendance.punch_in_time,
                attendance.punch_out_time,
            )
        else:
            attendance.working_hours = None

    attendance.save()
    log_attendance_activity(
        attendance,
        AttendanceActivityType.CORRECTION_APPROVED,
        user=correction.approved_by,
        old_value=f"punch_out={old_punch_out}, hours={old_hours}",
        new_value=f"punch_out={attendance.punch_out_time}, hours={attendance.working_hours}",
        comments=correction.reason,
    )
    return attendance


def approve_correction_request(
    correction: AttendanceCorrectionRequest,
    approver: User,
) -> AttendanceCorrectionRequest:
    """Approve a pending correction and update attendance."""
    from apps.attendance.access import user_can_approve_correction

    if not user_can_approve_correction(approver, correction):
        raise PermissionDenied("You do not have permission to approve this request.")

    _apply_correction_to_attendance(correction)
    correction.status = CorrectionStatus.APPROVED
    correction.approved_by = approver
    correction.approved_at = timezone.now()
    correction.save(
        update_fields=["status", "approved_by", "approved_at", "updated_at"],
    )
    return correction


def reject_correction_request(
    correction: AttendanceCorrectionRequest,
    approver: User,
    rejection_reason: str = "",
) -> AttendanceCorrectionRequest:
    """Reject a pending correction request."""
    from apps.attendance.access import user_can_approve_correction

    if not user_can_approve_correction(approver, correction):
        raise PermissionDenied("You do not have permission to reject this request.")

    correction.status = CorrectionStatus.REJECTED
    correction.approved_by = approver
    correction.approved_at = timezone.now()
    correction.rejection_reason = rejection_reason
    correction.save(
        update_fields=[
            "status",
            "approved_by",
            "approved_at",
            "rejection_reason",
            "updated_at",
        ],
    )

    log_attendance_activity(
        correction.attendance,
        AttendanceActivityType.CORRECTION_REJECTED,
        user=approver,
        comments=rejection_reason or "Correction request rejected.",
        new_value=CorrectionStatus.REJECTED,
    )
    return correction
