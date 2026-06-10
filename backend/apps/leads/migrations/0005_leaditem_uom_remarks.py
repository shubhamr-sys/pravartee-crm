from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0004_leaditem_and_legacy_items"),
    ]

    operations = [
        migrations.AddField(
            model_name="leaditem",
            name="uom",
            field=models.CharField(
                choices=[
                    ("NOS", "Nos"),
                    ("UNIT", "Unit"),
                    ("LOT", "Lot"),
                    ("METER", "Meter"),
                    ("FEET", "Feet"),
                    ("LICENSE", "License"),
                    ("USER", "User"),
                    ("PROJECT", "Project"),
                ],
                default="NOS",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="leaditem",
            name="remarks",
            field=models.TextField(blank=True, default=""),
        ),
    ]
