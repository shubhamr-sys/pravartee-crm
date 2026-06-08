"""
Consolidate product categories into IT, Non-IT, and Solution.

Legacy mapping:
  IT:       Laptop, PC, Printer, Server, Storage, Networking, UPS
  Solution: CCTV, Audio Visual, Data Centre
  Non-IT:   Other
"""
from django.db import migrations

from apps.leads.categories import LEGACY_CATEGORY_MAPPING, PRODUCT_CATEGORIES


def _lead_counts_by_category(ProductCategory, Lead):
    counts = {}
    for category in ProductCategory.objects.all().order_by("name"):
        counts[category.name] = Lead.objects.filter(category_id=category.pk).count()
    return counts


def forwards(apps, schema_editor):
    ProductCategory = apps.get_model("leads", "ProductCategory")
    Lead = apps.get_model("leads", "Lead")

    before = _lead_counts_by_category(ProductCategory, Lead)
    print("Product category migration — leads before:", before)

    target_categories = {}
    for name in PRODUCT_CATEGORIES:
        category, _created = ProductCategory.objects.get_or_create(name=name)
        target_categories[name] = category

    for old_name, new_name in LEGACY_CATEGORY_MAPPING.items():
        old_category = ProductCategory.objects.filter(name=old_name).first()
        if not old_category:
            continue

        new_category = target_categories[new_name]
        if old_category.pk == new_category.pk:
            continue

        Lead.objects.filter(category_id=old_category.pk).update(
            category_id=new_category.pk,
        )
        old_category.delete()

    valid_names = set(PRODUCT_CATEGORIES)
    fallback = target_categories.get("Non-IT")
    for orphan in ProductCategory.objects.exclude(name__in=valid_names):
        if fallback:
            Lead.objects.filter(category_id=orphan.pk).update(category_id=fallback.pk)
        orphan.delete()

    after = _lead_counts_by_category(ProductCategory, Lead)
    print("Product category migration — leads after:", after)
    print(
        "Product category migration — total leads:",
        sum(before.values()),
        "→",
        sum(after.values()),
    )


def backwards(apps, schema_editor):
    ProductCategory = apps.get_model("leads", "ProductCategory")
    Lead = apps.get_model("leads", "Lead")

    legacy_names = list(LEGACY_CATEGORY_MAPPING.keys())
    for name in legacy_names:
        ProductCategory.objects.get_or_create(name=name)

    it_category = ProductCategory.objects.filter(name="IT").first()
    if it_category:
        pc = ProductCategory.objects.filter(name="PC").first()
        if pc:
            Lead.objects.filter(category_id=it_category.pk).update(category_id=pc.pk)
        it_category.delete()

    for name in ("Non-IT", "Solution"):
        ProductCategory.objects.filter(name=name).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0002_update_lead_stages"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
