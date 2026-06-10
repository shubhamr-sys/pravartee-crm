import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0008_lead_record_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="leaditem",
            name="brand",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.brand",
            ),
        ),
        migrations.AlterField(
            model_name="leaditem",
            name="product_model",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.productmodel",
            ),
        ),
    ]
