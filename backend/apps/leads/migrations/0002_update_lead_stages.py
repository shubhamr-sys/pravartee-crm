"""
Migrate lead stages to the business sales process.

Mapping:
  Qualified   → Pre Bid
  Quoted      → Bid Floated
  Negotiation → Bid Evaluation
  Contacted   → Pre Bid
"""
from django.db import migrations

from apps.leads.stages import ALL_STAGES_ORDER, LEGACY_STAGE_MAPPING


def forwards(apps, schema_editor):
    LeadStage = apps.get_model("leads", "LeadStage")
    Lead = apps.get_model("leads", "Lead")

    # Avoid unique sequence conflicts while renaming/reordering.
    for index, stage in enumerate(LeadStage.objects.all().order_by("sequence", "name")):
        stage.sequence = 1000 + index
        stage.save(update_fields=["sequence"])

    for old_name, new_name in LEGACY_STAGE_MAPPING.items():
        old_stage = LeadStage.objects.filter(name=old_name).first()
        if not old_stage:
            continue

        new_stage = LeadStage.objects.filter(name=new_name).first()
        if new_stage and new_stage.pk != old_stage.pk:
            Lead.objects.filter(stage_id=old_stage.pk).update(stage_id=new_stage.pk)
            old_stage.delete()
        else:
            old_stage.name = new_name
            old_stage.save(update_fields=["name"])

    for sequence, name in enumerate(ALL_STAGES_ORDER, start=1):
        stage, _created = LeadStage.objects.get_or_create(
            name=name,
            defaults={"sequence": 1000 + sequence},
        )
        if stage.sequence != 1000 + sequence:
            stage.sequence = 1000 + sequence
            stage.save(update_fields=["sequence"])

    for sequence, name in enumerate(ALL_STAGES_ORDER, start=1):
        LeadStage.objects.filter(name=name).update(sequence=sequence)

    valid_names = set(ALL_STAGES_ORDER)
    fallback = LeadStage.objects.filter(name="New").first()
    for orphan in LeadStage.objects.exclude(name__in=valid_names):
        if fallback:
            Lead.objects.filter(stage_id=orphan.pk).update(stage_id=fallback.pk)
        orphan.delete()


def backwards(apps, schema_editor):
    LeadStage = apps.get_model("leads", "LeadStage")

    reverse_names = {
        "Pre Bid": "Qualified",
        "Bid Floated": "Quoted",
        "Bid Evaluation": "Negotiation",
    }
    legacy_order = [
        (1, "New"),
        (2, "Contacted"),
        (3, "Qualified"),
        (4, "Quoted"),
        (5, "Negotiation"),
        (6, "Won"),
        (7, "Lost"),
    ]

    for index, stage in enumerate(LeadStage.objects.all()):
        stage.sequence = 2000 + index
        stage.save(update_fields=["sequence"])

    for new_name, old_name in reverse_names.items():
        stage = LeadStage.objects.filter(name=new_name).first()
        if stage:
            stage.name = old_name
            stage.save(update_fields=["name"])

    LeadStage.objects.get_or_create(name="Contacted", defaults={"sequence": 2002})

    for sequence, name in legacy_order:
        LeadStage.objects.filter(name=name).update(sequence=sequence)


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
