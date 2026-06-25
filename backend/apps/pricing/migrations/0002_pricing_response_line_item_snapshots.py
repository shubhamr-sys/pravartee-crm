from django.db import migrations, models
import django.db.models.deletion


def backfill_snapshots_from_lead_items(apps, schema_editor):
    PricingResponseLineItem = apps.get_model("pricing", "PricingResponseLineItem")
    for row in PricingResponseLineItem.objects.select_related(
        "lead_item",
        "lead_item__category",
        "lead_item__product",
        "lead_item__brand",
        "lead_item__product_model",
    ).iterator():
        lead_item = row.lead_item
        if not lead_item:
            continue
        row.category_name = lead_item.category.name
        row.product_name = lead_item.product.name
        row.brand_name = lead_item.brand.name if lead_item.brand_id else ""
        row.model_name = (
            lead_item.product_model.name if lead_item.product_model_id else ""
        )
        row.quantity = lead_item.quantity
        row.specification = lead_item.specification or ""
        row.save(
            update_fields=[
                "category_name",
                "product_name",
                "brand_name",
                "model_name",
                "quantity",
                "specification",
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("pricing", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="pricingresponselineitem",
            name="brand_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pricingresponselineitem",
            name="category_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pricingresponselineitem",
            name="model_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pricingresponselineitem",
            name="product_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="pricingresponselineitem",
            name="quantity",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pricingresponselineitem",
            name="specification",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="pricingresponselineitem",
            name="lead_item",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="pricing_responses",
                to="leads.leaditem",
            ),
        ),
        migrations.RunPython(backfill_snapshots_from_lead_items, migrations.RunPython.noop),
    ]
