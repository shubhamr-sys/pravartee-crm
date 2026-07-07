from django.db import models


class ExpenseCategory(models.TextChoices):
    TRAVEL = "TRAVEL", "Travel"
    FOOD = "FOOD", "Food"
    ACCOMMODATION = "ACCOMMODATION", "Accommodation"
    FUEL = "FUEL", "Fuel"
    OTHER = "OTHER", "Other"


class ExpenseStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
