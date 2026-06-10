from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import SearchFilter

from apps.accounts.permissions import IsAuthenticatedCRMUser, IsCEO

from .master_serializers import (
    BrandMasterSerializer,
    ProductCategoryMasterSerializer,
    ProductMasterSerializer,
    ProductModelMasterSerializer,
)
from .models import Brand, Product, ProductCategory, ProductModel


class MasterReadMixin:
    """All authenticated CRM users can list/retrieve master data."""

    def get_permissions(self):
        return [IsAuthenticatedCRMUser()]


class CEOManageCategoryMixin(MasterReadMixin):
    """Categories: CEO-only create, update, and delete."""

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticatedCRMUser(), IsCEO()]
        return super().get_permissions()


class MasterDataCreateMixin(MasterReadMixin):
    """
    Products, brands, models: all CRM users can create;
    only CEO can update or delete.
    """

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticatedCRMUser(), IsCEO()]
        return super().get_permissions()


class ProductCategoryMasterViewSet(CEOManageCategoryMixin, viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all().order_by("name")
    serializer_class = ProductCategoryMasterSerializer


class ProductMasterViewSet(MasterDataCreateMixin, viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category").order_by("name")
    serializer_class = ProductMasterSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["category"]
    search_fields = ["name"]


class BrandMasterViewSet(MasterDataCreateMixin, viewsets.ModelViewSet):
    queryset = Brand.objects.select_related(
        "product",
        "product__category",
    ).order_by("name")
    serializer_class = BrandMasterSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["product"]
    search_fields = ["name"]


class ProductModelMasterViewSet(MasterDataCreateMixin, viewsets.ModelViewSet):
    queryset = ProductModel.objects.select_related(
        "brand",
        "brand__product",
        "brand__product__category",
    ).order_by("name")
    serializer_class = ProductModelMasterSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["brand"]
    search_fields = ["name"]
