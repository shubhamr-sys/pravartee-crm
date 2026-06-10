"""
Seed data for product master hierarchy.
"""
from apps.leads.models import Brand, Product, ProductCategory, ProductModel

MASTER_HIERARCHY: dict[str, dict[str, dict[str, list[str]]]] = {
    "IT": {
        "Laptop": {
            "Dell": ["Latitude 5540", "Latitude 7440"],
            "HP": ["EliteBook 840", "ProBook 450"],
        },
        "Server": {
            "Dell": ["PowerEdge R750", "PowerEdge R650"],
            "HPE": ["ProLiant DL380", "ProLiant DL360"],
        },
        "Printer": {
            "HP": ["LaserJet M404dn", "LaserJet Pro M428"],
            "Canon": ["imageRUNNER 2630i"],
        },
        "Networking Switch": {
            "Cisco": ["Catalyst 9200", "Catalyst 2960"],
            "HPE": ["Aruba 2930F"],
        },
    },
    "Non-IT": {
        "Office Furniture": {
            "Godrej": ["Executive Desk", "Ergonomic Chair"],
            "Featherlite": ["Workstation Table"],
        },
        "Electrical Panel": {
            "Schneider": ["Prisma P Panel", "Easy9 Distribution Board"],
            "ABB": ["MNS Panel"],
        },
    },
    "Solution": {
        "CCTV System": {
            "Hikvision": ["DS-2CD2143G2", "DS-2CD2387G2"],
            "CP Plus": ["IP Dome Camera"],
        },
        "Audio Visual": {
            "BenQ": ["RM860K Interactive Panel"],
            "Samsung": ["QM85R Display"],
        },
        "Data Centre": {
            "APC": ["NetShelter SX Rack", "Symmetra UPS"],
            "Vertiv": ["SmartCabinet"],
        },
    },
}


def seed_product_masters() -> dict[str, int]:
    """Create or update product master hierarchy. Returns counts created."""
    counts = {"products": 0, "brands": 0, "models": 0}

    for category_name, products in MASTER_HIERARCHY.items():
        category, _ = ProductCategory.objects.get_or_create(name=category_name)
        for product_name, brands in products.items():
            product, product_created = Product.objects.get_or_create(
                category=category,
                name=product_name,
            )
            if product_created:
                counts["products"] += 1

            for brand_name, models in brands.items():
                brand, brand_created = Brand.objects.get_or_create(
                    product=product,
                    name=brand_name,
                )
                if brand_created:
                    counts["brands"] += 1

                for model_name in models:
                    _, model_created = ProductModel.objects.get_or_create(
                        brand=brand,
                        name=model_name,
                    )
                    if model_created:
                        counts["models"] += 1

    return counts
