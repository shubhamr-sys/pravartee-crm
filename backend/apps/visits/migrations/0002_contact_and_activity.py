from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("visits", "0001_initial"),
        ("accounts", "0004_user_manager"),
    ]

    operations = [
        migrations.AddField(
            model_name="fieldvisit",
            name="contact_person",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="fieldvisit",
            name="mobile",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="fieldvisit",
            name="designation",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.CreateModel(
            name="VisitActivity",
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
                (
                    "activity_type",
                    models.CharField(
                        choices=[
                            ("CHECK_IN", "Checked In"),
                            ("CHECK_OUT", "Checked Out"),
                            ("NOTE", "Note"),
                        ],
                        db_index=True,
                        max_length=30,
                    ),
                ),
                ("comments", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="visit_activities",
                        to="accounts.user",
                    ),
                ),
                (
                    "visit",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activities",
                        to="visits.fieldvisit",
                    ),
                ),
            ],
            options={
                "db_table": "field_visit_activities",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["visit", "created_at"],
                        name="field_visit_visit_i_a3a3a3_idx",
                    ),
                ],
            },
        ),
    ]
