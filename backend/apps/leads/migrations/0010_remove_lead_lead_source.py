from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0009_leaditem_optional_brand_model"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="lead",
            name="lead_source",
        ),
    ]
