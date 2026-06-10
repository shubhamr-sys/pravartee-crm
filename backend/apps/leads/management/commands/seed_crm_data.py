"""
Seed pipeline stages, product categories, master hierarchy, and sample leads.
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.leads.categories import PRODUCT_CATEGORIES, PRODUCT_CATEGORY_DESCRIPTIONS
from apps.leads.master_seed import seed_product_masters
from apps.leads.models import Brand, Lead, LeadItem, LeadStage, Product, ProductCategory, ProductModel
from apps.leads.stages import SEED_STAGES

User = get_user_model()

SAMPLE_LEAD_ITEMS = [
    {
        "customer_name": "Metro Hospital",
        "company_name": "Metro Healthcare Pvt Ltd",
        "items": [
            {
                "category": "IT",
                "product": "Laptop",
                "brand": "Dell",
                "model": "Latitude 5540",
                "quantity": 25,
                "specification": "i7, 16GB RAM, 512GB SSD",
            },
            {
                "category": "IT",
                "product": "Printer",
                "brand": "HP",
                "model": "LaserJet M404dn",
                "quantity": 5,
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
                "product": "CCTV System",
                "brand": "Hikvision",
                "model": "DS-2CD2143G2",
                "quantity": 40,
                "specification": "4MP, PoE, night vision",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed lead stages, product categories, masters, and sample lead items"

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

        master_counts = seed_product_masters()
        self.stdout.write(
            f"Product masters — products: {master_counts['products']}, "
            f"brands: {master_counts['brands']}, models: {master_counts['models']}",
        )

        if options["with_leads"]:
            self._seed_sample_leads()

        self.stdout.write(self.style.SUCCESS("Seed data complete."))

    def _resolve_master(self, category_name, product_name, brand_name, model_name):
        category = ProductCategory.objects.get(name=category_name)
        product, _ = Product.objects.get_or_create(category=category, name=product_name)
        brand, _ = Brand.objects.get_or_create(product=product, name=brand_name)
        model, _ = ProductModel.objects.get_or_create(brand=brand, name=model_name)
        return category, product, brand, model

    def _seed_sample_leads(self):
        stage = LeadStage.objects.filter(name="New").first()
        if not stage:
            self.stdout.write(self.style.WARNING("No 'New' stage found; skipping sample leads."))
            return

        assignee = User.objects.filter(is_active=True).order_by("date_joined").first()
        created_leads = 0

        for sample in SAMPLE_LEAD_ITEMS:
            if Lead.objects.filter(
                customer_name=sample["customer_name"],
                company_name=sample["company_name"],
            ).exists():
                continue

            first_item = sample["items"][0]
            category, _, _, _ = self._resolve_master(
                first_item["category"],
                first_item["product"],
                first_item["brand"],
                first_item["model"],
            )

            lead = Lead.objects.create(
                customer_name=sample["customer_name"],
                company_name=sample["company_name"],
                stage=stage,
                category=category,
                assigned_to=assignee,
            )

            for item_data in sample["items"]:
                cat, product, brand, model = self._resolve_master(
                    item_data["category"],
                    item_data["product"],
                    item_data["brand"],
                    item_data["model"],
                )
                LeadItem.objects.create(
                    lead=lead,
                    category=cat,
                    product=product,
                    brand=brand,
                    product_model=model,
                    quantity=item_data["quantity"],
                    specification=item_data.get("specification", ""),
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
