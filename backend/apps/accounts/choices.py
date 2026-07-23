from django.db import models


class UserRole(models.TextChoices):
    """CRM role hierarchy for authorization and reporting."""

    CEO = "CEO", "CEO"
    SALES_HEAD = "SALES_HEAD", "Sales Head"
    SALESPERSON = "SALESPERSON", "Salesperson"
    COMMERCIAL = "COMMERCIAL", "Commercial"
    ACCOUNTS = "ACCOUNTS", "Accounts"
