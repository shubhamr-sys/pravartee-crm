"""
Seed pipeline stages, product categories, and sample lead items.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.leads.categories import PRODUCT_CATEGORIES, PRODUCT_CATEGORY_DESCRIPTIONS
from apps.leads.models import Lead, LeadItem, LeadStage, ProductCategory
from apps.leads.stages import SEED_STAGES

User = get_user_model()

SAMPLE_LEAD_ITEMS = [
    {
        "customer_name": "Metro Hospital",
        "company_name": "Metro Healthcare Pvt Ltd",
        "items": [
            {
                "category": "IT",
                "product": "Dell Latitude Laptop",
                "brand": "Dell",
                "model": "5540",
                "quantity": 25,
                "unit_price": Decimal("72000.00"),
                "specification": "i7, 16GB RAM, 512GB SSD",
            },
            {
                "category": "IT",
                "product": "HP Laser Printer",
                "brand": "HP",
                "model": "M404dn",
                "quantity": 5,
                "unit_price": Decimal("28000.00"),
                "specification": "Duplex, network ready",
            },
        ],
    },
    {
        "customer_name": "Greenfield School",
        "company_name": "Greenfield Education Trust",
        "items": [
            {
                "category": "Solution",
                "product": "IP CCTV Camera",
                "brand": "Hikvision",
                "model": "DS-2CD2143G2",
                "quantity": 40,
                "unit_price": Decimal("8500.00"),
                "specification": "4MP, PoE, night vision",
            },
            {
                "category": "Solution",
                "product": "NVR Recorder",
                "brand": "Hikvision",
                "model": "DS-7632NI-K2",
                "quantity": 2,
                "unit_price": Decimal("45000.00"),
                "specification": "32-channel, 4TB included",
            },
        ],
    },
    {
        "customer_name": "Apex Manufacturing",
        "company_name": "Apex Industries",
        "items": [
            {
                "category": "Non-IT",
                "product": "Industrial UPS",
                "brand": "APC",
                "model": "SURT10000XLI",
                "quantity": 3,
                "unit_price": Decimal("185000.00"),
                "specification": "10kVA, rack mount",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed lead stages, product categories, and sample lead items"

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-leads",
            action="store_true",
            help="Create sample leads with product line items",
        )

    def handle(self, *args, **options):
        for sequence, name in SEED_STAGES:
            stage, created = LeadStage.objects.update_or_create(
                name=name,
                defaults={"sequence": sequence},
            )
            if stage.sequence != sequence:
                stage.sequence = sequence
                stage.save(update_fields=["sequence"])
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created stage: {name}"))
            else:
                self.stdout.write(f"Updated stage: {name}")

        for name in PRODUCT_CATEGORIES:
            description = PRODUCT_CATEGORY_DESCRIPTIONS.get(name, "")
            category, created = ProductCategory.objects.update_or_create(
                name=name,
                defaults={"description": description},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created category: {name}"))
            elif category.description != description:
                self.stdout.write(f"Updated category description: {name}")

        removed, _ = ProductCategory.objects.exclude(
            name__in=PRODUCT_CATEGORIES,
        ).delete()
        if removed:
            self.stdout.write(f"Removed {removed} legacy categor{'y' if removed == 1 else 'ies'}")

        if options["with_leads"]:
            self._seed_sample_leads()

        self.stdout.write(self.style.SUCCESS("Seed data complete."))

    def _seed_sample_leads(self):
        stage = LeadStage.objects.filter(name="New").first()
        if not stage:
            self.stdout.write(self.style.WARNING("No 'New' stage found; skipping sample leads."))
            return

        assignee = User.objects.filter(is_active=True).order_by("date_joined").first()
        categories = {
            cat.name: cat for cat in ProductCategory.objects.filter(name__in=PRODUCT_CATEGORIES)
        }

        created_leads = 0
        for sample in SAMPLE_LEAD_ITEMS:
            if Lead.objects.filter(
                customer_name=sample["customer_name"],
                company_name=sample["company_name"],
            ).exists():
                continue

            first_category = categories.get(sample["items"][0]["category"])
            if not first_category:
                continue

            lead = Lead.objects.create(
                customer_name=sample["customer_name"],
                company_name=sample["company_name"],
                stage=stage,
                category=first_category,
                assigned_to=assignee,
            )
            for item_data in sample["items"]:
                category = categories[item_data["category"]]
                LeadItem.objects.create(
                    lead=lead,
                    category=category,
                    product=item_data["product"],
                    brand=item_data["brand"],
                    model=item_data["model"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    specification=item_data["specification"],
                )

            from apps.leads.lead_item_services import sync_lead_from_items

            sync_lead_from_items(lead)
            created_leads += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created sample lead: {sample['customer_name']} "
                    f"({len(sample['items'])} products)",
                ),
            )

        if created_leads == 0:
            self.stdout.write("Sample leads already exist; none created.")
