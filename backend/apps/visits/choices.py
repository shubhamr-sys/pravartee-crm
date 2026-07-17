from django.db import models


class VisitStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"


class VisitActivityType(models.TextChoices):
    CHECK_IN = "CHECK_IN", "Checked In"
    CHECK_OUT = "CHECK_OUT", "Checked Out"
    NOTE = "NOTE", "Note"
