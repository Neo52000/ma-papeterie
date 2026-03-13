from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CatalogProduct:
    """Produit extrait du fichier Catalog JSON Comlandi."""

    id: str
    ean: str | None = None
    manufacturer_ref: str | None = None
    description: str = ""
    family: str = ""
    subfamily: str = ""
    brand: str = ""
    color: str = ""
    format: str = ""
    material: str = ""
    usage: str = ""
    weight_kg: str = ""
    country_origin: str = ""
    customs_code: str = ""
    is_active: bool = True
    additional_info: dict[str, Any] = field(default_factory=dict)


@dataclass
class MergedProduct:
    """Produit fusionné (Catalog + Prices + Stocks) prêt pour l'upsert DB."""

    reference: str
    ean: str | None = None
    name: str = ""
    description: str | None = None
    family: str | None = None
    subfamily: str | None = None
    brand: str | None = None
    cost_price: float = 0.0
    price_ht: float = 0.0
    price_ttc: float = 0.0
    tva_rate: float = 20.0
    eco_tax: float = 0.0
    suggested_price: float = 0.0
    coefficient_used: float = 2.0
    stock_quantity: int = 0
    weight_kg: float | None = None
    country_origin: str | None = None
    customs_code: str | None = None
    is_active: bool = True
    manufacturer_ref: str | None = None
    color: str | None = None
    format: str | None = None
    material: str | None = None
    usage: str | None = None
    tax_breakdown: dict[str, float] = field(default_factory=dict)
