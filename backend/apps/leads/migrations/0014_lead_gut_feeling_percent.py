from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0013_followup_action_taken"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="gut_feeling_percent",
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[
                    (10, "10%"),
                    (20, "20%"),
                    (30, "30%"),
                    (40, "40%"),
                    (50, "50%"),
                    (60, "60%"),
                    (70, "70%"),
                    (80, "80%"),
                    (90, "90%"),
                    (100, "100%"),
                ],
                null=True,
            ),
        ),
    ]
