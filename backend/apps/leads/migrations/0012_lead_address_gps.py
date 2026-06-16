from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0011_followup_stage_history"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="address",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="latitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="lead",
            name="longitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
            ),
        ),
    ]
