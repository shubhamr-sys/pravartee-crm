from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def link_sales_heads_to_ceo(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    ceo = User.objects.filter(role="CEO").order_by("created_at").first()
    if not ceo:
        return
    User.objects.filter(role="SALES_HEAD", manager__isnull=True).update(manager=ceo)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_password_reset"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="manager",
            field=models.ForeignKey(
                blank=True,
                help_text="Reports-to manager in the CRM hierarchy (CEO for Sales Head, Sales Head for Salesperson).",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="direct_reports",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(link_sales_heads_to_ceo, migrations.RunPython.noop),
    ]
