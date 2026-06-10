from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0007_leaditem_master_fks_remove_pricing"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="record_type",
            field=models.CharField(
                choices=[("LEAD", "Lead"), ("VISIT", "Visit")],
                default="LEAD",
                max_length=20,
            ),
        ),
    ]
