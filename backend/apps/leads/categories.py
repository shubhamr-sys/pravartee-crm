"""
Product category master data and legacy mapping.
"""

# Target category master list (display order).
PRODUCT_CATEGORIES: tuple[str, ...] = (
    "IT",
    "Non-IT",
    "Solution",
)

PRODUCT_CATEGORY_DESCRIPTIONS: dict[str, str] = {
    "IT": (
        "Computing and infrastructure products such as PCs, Laptops, Servers, "
        "Storage, Networking, UPS, Printers, and related hardware."
    ),
    "Non-IT": (
        "Products and services not directly related to information technology, "
        "including office, electrical, furniture, civil, and miscellaneous items."
    ),
    "Solution": (
        "Integrated solutions and projects such as CCTV, Audio Visual Systems, "
        "Data Centres, Command Centres, Smart Classrooms, and turnkey deployments."
    ),
}

# Map legacy category names to the new master categories.
LEGACY_CATEGORY_MAPPING: dict[str, str] = {
    "Laptop": "IT",
    "PC": "IT",
    "Printer": "IT",
    "Server": "IT",
    "Storage": "IT",
    "Networking": "IT",
    "UPS": "IT",
    "CCTV": "Solution",
    "Audio Visual": "Solution",
    "Data Centre": "Solution",
    "Other": "Non-IT",
}
