"""
Unit of measure choices for lead line items.
"""
from django.db import models


class LeadItemUOM(models.TextChoices):
    NOS = "NOS", "Nos"
    UNIT = "UNIT", "Unit"
    LOT = "LOT", "Lot"
    METER = "METER", "Meter"
    FEET = "FEET", "Feet"
    LICENSE = "LICENSE", "License"
    USER = "USER", "User"
    PROJECT = "PROJECT", "Project"
