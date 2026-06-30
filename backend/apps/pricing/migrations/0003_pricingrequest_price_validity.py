from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pricing", "0002_pricing_response_line_item_snapshots"),
    ]

    operations = [
        migrations.AddField(
            model_name="pricingrequest",
            name="price_validity",
            field=models.DateField(
                blank=True,
                help_text="Date until which the submitted prices remain valid.",
                null=True,
            ),
        ),
    ]
