from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0012_lead_address_gps"),
    ]

    operations = [
        migrations.AddField(
            model_name="followup",
            name="action_taken",
            field=models.TextField(blank=True),
        ),
    ]
