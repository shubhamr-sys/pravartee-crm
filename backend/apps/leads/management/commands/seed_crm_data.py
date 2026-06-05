"""
Seed pipeline stages and product categories from project requirements.
"""
from django.core.management.base import BaseCommand

from apps.leads.models import LeadStage, ProductCategory

STAGES = [
    (1, "New"),
    (2, "Contacted"),
    (3, "Qualified"),
    (4, "Quoted"),
    (5, "Negotiation"),
    (6, "Won"),
    (7, "Lost"),
]

CATEGORIES = [
    "PC",
    "Laptop",
    "Printer",
    "Networking",
    "Data Centre",
    "Audio Visual",
    "CCTV",
    "UPS",
    "Server",
    "Storage",
    "Other",
]


class Command(BaseCommand):
    help = "Seed lead stages and product categories"

    def handle(self, *args, **options):
        for sequence, name in STAGES:
            _, created = LeadStage.objects.get_or_create(
                sequence=sequence,
                defaults={"name": name},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created stage: {name}"))

        for name in CATEGORIES:
            _, created = ProductCategory.objects.get_or_create(name=name)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created category: {name}"))

        self.stdout.write(self.style.SUCCESS("Seed data complete."))
