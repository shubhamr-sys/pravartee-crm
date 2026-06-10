import django.db.models.deletion
from django.db import migrations, models


def _get_or_create_product(Product, category_id, name):
    product, _ = Product.objects.get_or_create(
        category_id=category_id,
        name=name[:255],
    )
    return product


def _get_or_create_brand(Brand, product_id, name):
    brand, _ = Brand.objects.get_or_create(
        product_id=product_id,
        name=name[:255] or "Generic",
    )
    return brand


def _get_or_create_model(ProductModel, brand_id, name):
    model, _ = ProductModel.objects.get_or_create(
        brand_id=brand_id,
        name=name[:255] or "Standard",
    )
    return model


def migrate_lead_items_to_masters(apps, schema_editor):
    LeadItem = apps.get_model("leads", "LeadItem")
    Product = apps.get_model("leads", "Product")
    Brand = apps.get_model("leads", "Brand")
    ProductModel = apps.get_model("leads", "ProductModel")

    for item in LeadItem.objects.all().iterator():
        product = _get_or_create_product(
            Product,
            item.category_id,
            item.product_name or "Legacy Product",
        )
        brand = _get_or_create_brand(Brand, product.pk, item.brand_name or "Generic")
        model = _get_or_create_model(
            ProductModel,
            brand.pk,
            item.model_name or "Standard",
        )
        item.product_fk_id = product.pk
        item.brand_fk_id = brand.pk
        item.product_model_id = model.pk
        item.save(
            update_fields=["product_fk_id", "brand_fk_id", "product_model_id"],
        )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("leads", "0006_product_masters"),
    ]

    operations = [
        migrations.RenameField(
            model_name="leaditem",
            old_name="product",
            new_name="product_name",
        ),
        migrations.RenameField(
            model_name="leaditem",
            old_name="brand",
            new_name="brand_name",
        ),
        migrations.RenameField(
            model_name="leaditem",
            old_name="model",
            new_name="model_name",
        ),
        migrations.AddField(
            model_name="leaditem",
            name="product_fk",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.product",
            ),
        ),
        migrations.AddField(
            model_name="leaditem",
            name="brand_fk",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.brand",
            ),
        ),
        migrations.AddField(
            model_name="leaditem",
            name="product_model",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.productmodel",
            ),
        ),
        migrations.RunPython(migrate_lead_items_to_masters, migrations.RunPython.noop),
        migrations.RemoveIndex(
            model_name="leaditem",
            name="lead_items_product_idx",
        ),
        migrations.RemoveIndex(
            model_name="leaditem",
            name="lead_items_brand_idx",
        ),
        migrations.RemoveField(model_name="leaditem", name="product_name"),
        migrations.RemoveField(model_name="leaditem", name="brand_name"),
        migrations.RemoveField(model_name="leaditem", name="model_name"),
        migrations.RemoveField(model_name="leaditem", name="unit_price"),
        migrations.RemoveField(model_name="leaditem", name="total_price"),
        migrations.RenameField(
            model_name="leaditem",
            old_name="product_fk",
            new_name="product",
        ),
        migrations.RenameField(
            model_name="leaditem",
            old_name="brand_fk",
            new_name="brand",
        ),
        migrations.AlterField(
            model_name="leaditem",
            name="product",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.product",
            ),
        ),
        migrations.AlterField(
            model_name="leaditem",
            name="brand",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.brand",
            ),
        ),
        migrations.AlterField(
            model_name="leaditem",
            name="product_model",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="lead_items",
                to="leads.productmodel",
            ),
        ),
        migrations.RemoveField(model_name="lead", name="estimated_value"),
        migrations.AddIndex(
            model_name="leaditem",
            index=models.Index(fields=["product_model"], name="lead_items_model_idx"),
        ),
    ]
