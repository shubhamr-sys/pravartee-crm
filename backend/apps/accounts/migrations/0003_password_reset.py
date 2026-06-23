# Generated migration for password reset

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_role_index"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="password_reset_email_count",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Number of forgot-password emails sent (max 3 per account).",
            ),
        ),
        migrations.CreateModel(
            name="PasswordResetToken",
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
                ("token", models.CharField(db_index=True, max_length=64, unique=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="password_reset_tokens",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "password_reset_tokens",
                "ordering": ["-created_at"],
            },
        ),
    ]
