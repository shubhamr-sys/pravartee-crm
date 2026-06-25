"""
Bulk import product master data from CSV.
"""
import csv
import io
import re
from dataclasses import dataclass, field

from apps.leads.categories import PRODUCT_CATEGORIES
from apps.leads.models import Brand, Product, ProductCategory, ProductModel
from apps.leads.uom import LeadItemUOM

REQUIRED_COLUMNS = ("category", "product")
OPTIONAL_COLUMNS = ("brand", "model", "quantity", "uom", "specification", "remarks")
EXAMPLE_CSV = """category,product,brand,model,quantity,uom,specification,remarks
IT,Laptop,Dell,Latitude 5540,2,NOS,16GB RAM / 512GB SSD,Standard warranty
IT,Laptop,HP,EliteBook 840,1,NOS,,
IT,Desktop,Dell,,5,UNIT,i7 / 16GB,Office rollout
Solution,CCTV System,Hikvision,DS-2CD2143G2,4,NOS,4MP outdoor,Include installation
Non-IT,Office Furniture,Godrej,Executive Desk,10,NOS,Wooden finish,Delivery to site
"""

_UOM_LOOKUP: dict[str, str] = {}
for uom_value, uom_label in LeadItemUOM.choices:
    _UOM_LOOKUP[uom_value.lower()] = uom_value
    _UOM_LOOKUP[uom_label.lower()] = uom_value
    _UOM_LOOKUP[uom_label.lower().replace(" ", "")] = uom_value


@dataclass
class ImportRowError:
    row: int
    message: str


@dataclass
class ImportedLineItem:
    category: str
    product: str
    brand: str
    model: str
    category_name: str
    product_name: str
    brand_name: str
    model_name: str
    quantity: int
    uom: str
    specification: str
    remarks: str

    def as_dict(self) -> dict:
        return {
            "category": self.category,
            "product": self.product,
            "brand": self.brand,
            "model": self.model,
            "category_name": self.category_name,
            "product_name": self.product_name,
            "brand_name": self.brand_name,
            "model_name": self.model_name,
            "quantity": self.quantity,
            "uom": self.uom,
            "specification": self.specification,
            "remarks": self.remarks,
        }


@dataclass
class ProductImportResult:
    created_products: int = 0
    created_brands: int = 0
    created_models: int = 0
    processed_rows: int = 0
    line_items: list[ImportedLineItem] = field(default_factory=list)
    errors: list[ImportRowError] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "created": {
                "products": self.created_products,
                "brands": self.created_brands,
                "models": self.created_models,
            },
            "processed_rows": self.processed_rows,
            "line_items": [item.as_dict() for item in self.line_items],
            "errors": [{"row": error.row, "message": error.message} for error in self.errors],
        }


def _normalize_header(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return normalized.strip("_")


def _normalize_cell(value: str | None) -> str:
    if value is None:
        return ""
    return value.strip()


def _header_key(header_map: dict[str, str], *candidates: str) -> str | None:
    for candidate in candidates:
        if candidate in header_map:
            return header_map[candidate]
    return None


def _load_category_map() -> dict[str, ProductCategory]:
    allowed = set(PRODUCT_CATEGORIES)
    return {
        category.name: category
        for category in ProductCategory.objects.filter(name__in=allowed)
    }


def _parse_quantity(raw: str, row_number: int, result: ProductImportResult) -> int | None:
    if not raw:
        return 1
    try:
        quantity = int(raw)
    except (TypeError, ValueError):
        result.errors.append(
            ImportRowError(row=row_number, message="Quantity must be a whole number."),
        )
        return None
    if quantity < 1:
        result.errors.append(
            ImportRowError(row=row_number, message="Quantity must be at least 1."),
        )
        return None
    return quantity


def _parse_uom(raw: str, row_number: int, result: ProductImportResult) -> str | None:
    if not raw:
        return LeadItemUOM.NOS
    lookup_key = raw.strip().lower().replace(" ", "")
    uom = _UOM_LOOKUP.get(raw.strip().lower()) or _UOM_LOOKUP.get(lookup_key)
    if not uom:
        allowed = ", ".join(label for _, label in LeadItemUOM.choices)
        result.errors.append(
            ImportRowError(
                row=row_number,
                message=f"Unknown UOM '{raw}'. Use one of: {allowed}.",
            ),
        )
        return None
    return uom


def import_products_from_csv(file_obj) -> ProductImportResult:
    """Parse CSV and create missing product hierarchy rows."""
    result = ProductImportResult()
    category_map = _load_category_map()

    try:
        raw = file_obj.read()
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        result.errors.append(ImportRowError(row=0, message="CSV must be UTF-8 encoded."))
        return result

    reader = csv.DictReader(io.StringIO(raw))
    if not reader.fieldnames:
        result.errors.append(ImportRowError(row=1, message="CSV header row is required."))
        return result

    header_map = {_normalize_header(name): name for name in reader.fieldnames if name}
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in header_map]
    if missing_columns:
        result.errors.append(
            ImportRowError(
                row=1,
                message=f"Missing required column(s): {', '.join(missing_columns)}.",
            ),
        )
        return result

    category_key = header_map["category"]
    product_key = header_map["product"]
    brand_key = _header_key(header_map, "brand")
    model_key = _header_key(header_map, "model")
    quantity_key = _header_key(header_map, "quantity", "qty")
    uom_key = _header_key(header_map, "uom", "unit_of_measure")
    specification_key = _header_key(header_map, "specification", "spec")
    remarks_key = _header_key(header_map, "remarks", "remarks_scope", "scope")

    for row_number, row in enumerate(reader, start=2):
        if not any(_normalize_cell(value) for value in row.values()):
            continue

        category_name = _normalize_cell(row.get(category_key))
        product_name = _normalize_cell(row.get(product_key))
        brand_name = _normalize_cell(row.get(brand_key)) if brand_key else ""
        model_name = _normalize_cell(row.get(model_key)) if model_key else ""
        quantity_raw = _normalize_cell(row.get(quantity_key)) if quantity_key else ""
        uom_raw = _normalize_cell(row.get(uom_key)) if uom_key else ""
        specification = (
            _normalize_cell(row.get(specification_key)) if specification_key else ""
        )
        remarks = _normalize_cell(row.get(remarks_key)) if remarks_key else ""

        if not category_name or not product_name:
            result.errors.append(
                ImportRowError(
                    row=row_number,
                    message="Category and product are required.",
                ),
            )
            continue

        if model_name and not brand_name:
            result.errors.append(
                ImportRowError(
                    row=row_number,
                    message="Brand is required when model is provided.",
                ),
            )
            continue

        category = category_map.get(category_name)
        if not category:
            allowed = ", ".join(PRODUCT_CATEGORIES)
            result.errors.append(
                ImportRowError(
                    row=row_number,
                    message=f"Unknown category '{category_name}'. Use one of: {allowed}.",
                ),
            )
            continue

        quantity = _parse_quantity(quantity_raw, row_number, result)
        if quantity is None:
            continue

        uom = _parse_uom(uom_raw, row_number, result)
        if uom is None:
            continue

        product, product_created = Product.objects.get_or_create(
            category=category,
            name=product_name,
        )
        if product_created:
            result.created_products += 1

        brand = None
        product_model = None
        if brand_name:
            brand, brand_created = Brand.objects.get_or_create(
                product=product,
                name=brand_name,
            )
            if brand_created:
                result.created_brands += 1

            if model_name:
                product_model, model_created = ProductModel.objects.get_or_create(
                    brand=brand,
                    name=model_name,
                )
                if model_created:
                    result.created_models += 1

        result.line_items.append(
            ImportedLineItem(
                category=str(category.id),
                product=str(product.id),
                brand=str(brand.id) if brand else "",
                model=str(product_model.id) if product_model else "",
                category_name=category.name,
                product_name=product.name,
                brand_name=brand.name if brand else "",
                model_name=product_model.name if product_model else "",
                quantity=quantity,
                uom=uom,
                specification=specification,
                remarks=remarks,
            ),
        )
        result.processed_rows += 1

    return result
