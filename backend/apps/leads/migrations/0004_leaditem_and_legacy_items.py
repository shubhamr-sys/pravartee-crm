"""
Add LeadItem model and migrate existing leads to line items.
"""
from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion
import uuid


def migrate_legacy_leads_to_items(apps, schema_editor):
    Lead = apps.get_model("leads", "Lead")
    LeadItem = apps.get_model("leads", "LeadItem")

    migrated = 0
    for lead in Lead.objects.select_related("category").iterator():
        if LeadItem.objects.filter(lead_id=lead.pk).exists():
            continue
        if not lead.category_id:
            continue

        quantity = 1
        unit_price = lead.estimated_value or Decimal("0.00")
        total_price = (Decimal(quantity) * Decimal(unit_price)).quantize(Decimal("0.01"))
        LeadItem.objects.create(
            lead_id=lead.pk,
            category_id=lead.category_id,
            product="Legacy Product",
            brand="",
            model="",
            quantity=quantity,
            unit_price=unit_price,
            total_price=total_price,
            specification="Migrated from single-category lead.",
        )
        migrated += 1

    print(f"Lead items migration — created items for {migrated} legacy leads.")


def reverse_legacy_items(apps, schema_editor):
    LeadItem = apps.get_model("leads", "LeadItem")
    LeadItem.objects.filter(product="Legacy Product").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0003_update_product_categories"),
    ]

    operations = [
        migrations.AlterField(
            model_name="lead",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="leads",
                to="leads.productcategory",
            ),
        ),
        migrations.CreateModel(
            name="LeadItem",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("product", models.CharField(max_length=255)),
                ("brand", models.CharField(blank=True, max_length=255)),
                ("model", models.CharField(blank=True, max_length=255)),
                ("quantity", models.PositiveIntegerField(default=1)),
                (
                    "unit_price",
                    models.DecimalField(decimal_places=2, default=0, max_digits=15),
                ),
                (
                    "total_price",
                    models.DecimalField(decimal_places=2, default=0, max_digits=15),
                ),
                ("specification", models.TextField(blank=True)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="lead_items",
                        to="leads.productcategory",
                    ),
                ),
                (
                    "lead",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="leads.lead",
                    ),
                ),
            ],
            options={
                "db_table": "lead_items",
                "ordering": ["created_at"],
                "indexes": [
                    models.Index(fields=["lead"], name="lead_items_lead_id_idx"),
                    models.Index(fields=["category"], name="lead_items_category_idx"),
                    models.Index(fields=["product"], name="lead_items_product_idx"),
                    models.Index(fields=["brand"], name="lead_items_brand_idx"),
                ],
            },
        ),
        migrations.RunPython(migrate_legacy_leads_to_items, reverse_legacy_items),
    ]
