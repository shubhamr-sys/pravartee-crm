from django.db import models


class AttendanceActivityType(models.TextChoices):
    ATTENDANCE_CREATED = "ATTENDANCE_CREATED", "Attendance Created"
    PUNCH_IN_RECORDED = "PUNCH_IN_RECORDED", "Punch In Recorded"
    PUNCH_OUT_RECORDED = "PUNCH_OUT_RECORDED", "Punch Out Recorded"
