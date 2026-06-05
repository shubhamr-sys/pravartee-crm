from django.db import models


class CorrectionType(models.TextChoices):
    ACCIDENTAL_PUNCH_OUT = "ACCIDENTAL_PUNCH_OUT", "Accidental Punch Out"
    MISSED_PUNCH_OUT = "MISSED_PUNCH_OUT", "Missed Punch Out"
    INCORRECT_TIME = "INCORRECT_TIME", "Incorrect Time"
    GPS_ISSUE = "GPS_ISSUE", "GPS Issue"
    OTHER = "OTHER", "Other"


class CorrectionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class AttendanceActivityType(models.TextChoices):
    ATTENDANCE_CREATED = "ATTENDANCE_CREATED", "Attendance Created"
    PUNCH_IN_RECORDED = "PUNCH_IN_RECORDED", "Punch In Recorded"
    PUNCH_OUT_RECORDED = "PUNCH_OUT_RECORDED", "Punch Out Recorded"
    CORRECTION_REQUESTED = "CORRECTION_REQUESTED", "Correction Requested"
    CORRECTION_APPROVED = "CORRECTION_APPROVED", "Correction Approved"
    CORRECTION_REJECTED = "CORRECTION_REJECTED", "Correction Rejected"
