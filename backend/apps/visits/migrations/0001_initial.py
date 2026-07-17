# Generated manually for FieldVisit

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FieldVisit",
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
                ("department_name", models.CharField(max_length=255)),
                ("purpose", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("IN_PROGRESS", "In Progress"),
                            ("COMPLETED", "Completed"),
                        ],
                        db_index=True,
                        default="IN_PROGRESS",
                        max_length=20,
                    ),
                ),
                ("check_in_time", models.DateTimeField()),
                ("check_out_time", models.DateTimeField(blank=True, null=True)),
                ("check_in_latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("check_in_longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                (
                    "check_out_latitude",
                    models.DecimalField(
                        blank=True, decimal_places=6, max_digits=9, null=True
                    ),
                ),
                (
                    "check_out_longitude",
                    models.DecimalField(
                        blank=True, decimal_places=6, max_digits=9, null=True
                    ),
                ),
                (
                    "duration_hours",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=5, null=True
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="field_visits",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "field_visits",
                "ordering": ["-check_in_time"],
                "indexes": [
                    models.Index(
                        fields=["user", "check_in_time"],
                        name="field_visit_user_id_c1c1c1_idx",
                    ),
                    models.Index(
                        fields=["status", "check_in_time"],
                        name="field_visit_status_d2d2d2_idx",
                    ),
                ],
            },
        ),
    ]
