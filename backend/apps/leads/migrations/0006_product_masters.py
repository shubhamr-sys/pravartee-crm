import uuid

from django.db import migrations, models
import django.db.models.deletion


def seed_masters(apps, schema_editor):
    ProductCategory = apps.get_model("leads", "ProductCategory")
    Product = apps.get_model("leads", "Product")
    Brand = apps.get_model("leads", "Brand")
    ProductModel = apps.get_model("leads", "ProductModel")

    hierarchy = {
        "IT": {
            "Laptop": {"Dell": ["Latitude 5540"], "HP": ["EliteBook 840"]},
            "Server": {"Dell": ["PowerEdge R750"]},
            "Printer": {"HP": ["LaserJet M404dn"]},
        },
        "Non-IT": {
            "Office Furniture": {"Godrej": ["Executive Desk"]},
        },
        "Solution": {
            "CCTV System": {"Hikvision": ["DS-2CD2143G2"]},
        },
    }

    for category_name, products in hierarchy.items():
        category, _ = ProductCategory.objects.get_or_create(name=category_name)
        for product_name, brands in products.items():
            product, _ = Product.objects.get_or_create(
                category_id=category.pk,
                name=product_name,
            )
            for brand_name, models_list in brands.items():
                brand, _ = Brand.objects.get_or_create(
                    product_id=product.pk,
                    name=brand_name,
                )
                for model_name in models_list:
                    ProductModel.objects.get_or_create(
                        brand_id=brand.pk,
                        name=model_name,
                    )


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0005_leaditem_uom_remarks"),
    ]

    operations = [
        migrations.CreateModel(
            name="Product",
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
                ("name", models.CharField(max_length=255)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="products",
                        to="leads.productcategory",
                    ),
                ),
            ],
            options={
                "db_table": "products",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Brand",
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
                ("name", models.CharField(max_length=255)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="brands",
                        to="leads.product",
                    ),
                ),
            ],
            options={
                "db_table": "brands",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="ProductModel",
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
                ("name", models.CharField(max_length=255)),
                (
                    "brand",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="models",
                        to="leads.brand",
                    ),
                ),
            ],
            options={
                "db_table": "product_models",
                "ordering": ["name"],
                "verbose_name": "product model",
                "verbose_name_plural": "product models",
            },
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.UniqueConstraint(
                fields=("category", "name"),
                name="unique_product_per_category",
            ),
        ),
        migrations.AddConstraint(
            model_name="brand",
            constraint=models.UniqueConstraint(
                fields=("product", "name"),
                name="unique_brand_per_product",
            ),
        ),
        migrations.AddConstraint(
            model_name="productmodel",
            constraint=models.UniqueConstraint(
                fields=("brand", "name"),
                name="unique_model_per_brand",
            ),
        ),
        migrations.RunPython(seed_masters, migrations.RunPython.noop),
    ]
