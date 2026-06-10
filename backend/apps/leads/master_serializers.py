from rest_framework import serializers

from .models import Brand, Product, ProductModel


class ProductMasterSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "category",
            "category_name",
            "name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Product name is required.")
        return value.strip()


class BrandMasterSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    category_name = serializers.CharField(
        source="product.category.name",
        read_only=True,
    )

    class Meta:
        model = Brand
        fields = [
            "id",
            "product",
            "product_name",
            "category_name",
            "name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Brand name is required.")
        return value.strip()


class ProductModelMasterSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    product_name = serializers.CharField(source="brand.product.name", read_only=True)
    category_name = serializers.CharField(
        source="brand.product.category.name",
        read_only=True,
    )

    class Meta:
        model = ProductModel
        fields = [
            "id",
            "brand",
            "brand_name",
            "product_name",
            "category_name",
            "name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Model name is required.")
        return value.strip()
