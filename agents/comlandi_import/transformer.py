"""Transformation : EAN, prix, merge catalog+prices+stocks."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

from .models.price import PriceProduct
from .models.product import CatalogProduct, MergedProduct
from .models.stock import StockProduct

log = logging.getLogger(__name__)


# ─── EAN Normalization (port exact de normalize-ean.ts) ───


def compute_check_digit(digits: str) -> int:
    """Calcule le chiffre de contrôle EAN/GTIN (modulo 10, pondération 1/3)."""
    length = len(digits)
    total = 0
    for i in range(length - 1):
        d = int(digits[i])
        weight = 1 if (length - 1 - i) % 2 == 0 else 3
        total += d * weight
    return (10 - (total % 10)) % 10


def is_valid_ean_check_digit(ean: str) -> bool:
    """Vérifie si le chiffre de contrôle EAN est valide."""
    if not re.match(r"^\d{8,14}$", ean):
        return False
    expected = compute_check_digit(ean)
    actual = int(ean[-1])
    return expected == actual


def normalize_ean(raw: str | None, strict: bool = False) -> str | None:
    """Normalise un code EAN/GTIN.

    Port exact de normalize-ean.ts:
    - Strip non-digits
    - Reject < 8 ou > 14 digits
    - Pad à 13 digits
    - Check digit optionnel en mode strict
    """
    if not raw:
        return None
    cleaned = re.sub(r"[^0-9]", "", str(raw))
    if len(cleaned) < 8 or len(cleaned) > 14:
        return None
    normalized = cleaned.zfill(13)
    if strict and not is_valid_ean_check_digit(normalized):
        return None
    return normalized


def normalize_ean_with_report(raw: str | None) -> tuple[str | None, str | None]:
    """Normalise un EAN avec rapport d'anomalie.

    Returns (ean, warning_or_none).
    """
    if not raw:
        return None, None
    cleaned = re.sub(r"[^0-9]", "", str(raw))
    if len(cleaned) < 8 or len(cleaned) > 14:
        return None, f"EAN invalide (longueur {len(cleaned)}): {raw}"
    normalized = cleaned.zfill(13)
    valid = is_valid_ean_check_digit(normalized)
    warning = None if valid else f"EAN avec chiffre de contrôle invalide: {raw} → {normalized}"
    return normalized, warning


# ─── Parsing helpers (port de import-helpers.ts) ───


def parse_num(val: Any) -> float:
    """Parse un nombre depuis une chaîne. Format européen supporté."""
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s or s == "N/D":
        return 0.0
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def clean_str(val: Any) -> str | None:
    """Nettoie une chaîne : retourne None si vide ou 'N/D'."""
    if val is None:
        return None
    s = str(val).strip()
    if not s or s == "N/D":
        return None
    return s


# ─── Coefficient Lookup (port de TS:606-615) ───


def get_coefficient(
    coefficients: dict[str, float],
    family: str | None,
    subfamily: str | None,
    default: float = 2.0,
) -> float:
    """Lookup coefficient pricing par famille/sous-famille.

    Priorité: family::subfamily > family:: > default
    """
    if not family:
        return default
    if subfamily:
        specific = coefficients.get(f"{family}::{subfamily}")
        if specific is not None:
            return specific
    family_level = coefficients.get(f"{family}::")
    if family_level is not None:
        return family_level
    return default


# ─── Price Calculation (port de TS:660-680) ───


def calculate_prices(
    cost_price: float,
    suggested_price: float,
    tva_rate: float,
    taxes: dict[str, float],
    coefficient: float,
) -> tuple[float, float, float]:
    """Calcule price_ht, price_ttc, eco_tax.

    Logique (TS:664-680):
    - Si suggested > 0: price_ttc = suggested, derive HT
    - Sinon si cost > 0: HT = cost * coeff, derive TTC
    - eco_tax = somme des taxes (COP + D3E + MOB + SCM + SOD)
    - final_ttc += eco_tax

    Returns (price_ht, price_ttc, eco_tax).
    """
    price_ht = 0.0
    price_ttc = 0.0

    if suggested_price > 0:
        price_ttc = suggested_price
        price_ht = round(price_ttc / (1 + tva_rate / 100) * 100) / 100
    elif cost_price > 0:
        price_ht = round(cost_price * coefficient * 100) / 100
        price_ttc = round(price_ht * (1 + tva_rate / 100) * 100) / 100

    eco_tax = sum(taxes.values())
    final_ttc = round((price_ttc + eco_tax) * 100) / 100

    return price_ht, final_ttc, eco_tax


# ─── Merge All ───


def merge_all(
    catalog: dict[str, CatalogProduct],
    prices: dict[str, PriceProduct],
    stocks: dict[str, StockProduct],
    coefficients: dict[str, float],
    default_coefficient: float = 2.0,
    default_tva_rate: float = 20.0,
) -> dict[str, MergedProduct]:
    """Fusionne catalog + prices + stocks → {ref: MergedProduct}.

    Union des refs depuis catalog et prices.
    """
    all_refs = set(catalog.keys()) | set(prices.keys())
    result: dict[str, MergedProduct] = {}
    skipped = 0

    for ref in all_refs:
        cat = catalog.get(ref)
        price = prices.get(ref)
        stock = stocks.get(ref)

        # Price data
        cost_price = price.cost_price if price else 0.0
        suggested_price = price.suggested_price if price else 0.0
        tva_rate = price.tva_rate if price and price.tva_rate > 0 else default_tva_rate
        taxes = price.taxes if price else {}

        # Skip if no pricing info at all
        if cost_price <= 0 and suggested_price <= 0:
            skipped += 1
            continue

        # Get coefficient
        family = clean_str(cat.family) if cat else None
        subfamily = clean_str(cat.subfamily) if cat else None
        coeff = get_coefficient(coefficients, family, subfamily, default_coefficient)

        price_ht, price_ttc, eco_tax = calculate_prices(
            cost_price, suggested_price, tva_rate, taxes, coeff,
        )

        # Build tax breakdown
        tax_breakdown: dict[str, float] = {}
        for key, val in taxes.items():
            if val > 0:
                code = key.replace("taxe_", "").upper()
                tax_breakdown[code] = val

        # EAN normalization
        raw_ean = cat.ean if cat else None
        ean = normalize_ean(raw_ean)

        # Stock
        stock_qty = stock.available_quantity if stock else 0

        # Name — fallback: brand + ref, puis "Réf. xxx"
        name = ""
        if cat:
            name = clean_str(cat.description) or ""
        if not name:
            brand_str = clean_str(cat.brand) if cat else None
            parts = [p for p in [brand_str, ref] if p]
            name = " ".join(parts) if parts else f"Réf. {ref or ean or 'inconnue'}"

        result[ref] = MergedProduct(
            reference=ref,
            ean=ean,
            name=name[:255],
            description=clean_str(cat.description) if cat else None,
            family=family,
            subfamily=subfamily,
            brand=clean_str(cat.brand) if cat else None,
            cost_price=cost_price,
            price_ht=price_ht,
            price_ttc=price_ttc,
            tva_rate=tva_rate,
            eco_tax=eco_tax,
            suggested_price=suggested_price,
            coefficient_used=coeff,
            stock_quantity=stock_qty,
            weight_kg=parse_num(cat.weight_kg) if cat and cat.weight_kg else None,
            country_origin=clean_str(cat.country_origin) if cat else None,
            customs_code=clean_str(cat.customs_code) if cat else None,
            is_active=cat.is_active if cat else True,
            manufacturer_ref=clean_str(cat.manufacturer_ref) if cat else None,
            color=clean_str(cat.color) if cat else None,
            format=clean_str(cat.format) if cat else None,
            material=clean_str(cat.material) if cat else None,
            usage=clean_str(cat.usage) if cat else None,
            tax_breakdown=tax_breakdown,
        )

    log.info(f"Merge: {len(result)} produits fusionnés, {skipped} sans prix ignorés")
    return result


# ─── Build DB Rows (port de TS:682-841) ───


def build_product_row(merged: MergedProduct, category_id: str | None = None) -> dict[str, Any]:
    """Construit la row pour la table products."""
    now = datetime.now(timezone.utc).isoformat()
    data: dict[str, Any] = {
        "name": merged.name,
        "category": merged.family or "Non classé",
        "subcategory": merged.subfamily,
        "family": merged.family,
        "subfamily": merged.subfamily,
        "brand": merged.brand,
        "cost_price": merged.cost_price if merged.cost_price > 0 else None,
        "price_ht": merged.price_ht,
        "price_ttc": merged.price_ttc,
        "price": merged.price_ttc,
        "tva_rate": merged.tva_rate,
        "eco_tax": merged.eco_tax if merged.eco_tax > 0 else None,
        "weight_kg": merged.weight_kg if merged.weight_kg and merged.weight_kg > 0 else None,
        "country_origin": merged.country_origin,
        "customs_code": merged.customs_code,
        "is_active": merged.is_active,
        "is_end_of_life": False,
        "updated_at": now,
        "attributs": {
            "source": "liderpapel",
            "ref_liderpapel": merged.reference,
            "suggested_price_original": merged.suggested_price or None,
            "cost_price_original": merged.cost_price or None,
        },
    }
    if merged.stock_quantity >= 0:
        data["stock_quantity"] = merged.stock_quantity
    if category_id:
        data["category_id"] = category_id
    return data


def build_supplier_offer(
    product_id: str,
    merged: MergedProduct,
    ref: str,
) -> dict[str, Any]:
    """Construit la row pour supplier_offers."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "product_id": product_id,
        "supplier": "COMLANDI",
        "supplier_product_id": ref or merged.ean or product_id,
        "purchase_price_ht": merged.cost_price if merged.cost_price > 0 else None,
        "pvp_ttc": merged.suggested_price if merged.suggested_price > 0 else None,
        "vat_rate": merged.tva_rate,
        "tax_breakdown": merged.tax_breakdown,
        "stock_qty": merged.stock_quantity,
        "min_qty": 1,
        "is_active": True,
        "last_seen_at": now,
    }


def build_supplier_product(
    supplier_id: str,
    product_id: str,
    merged: MergedProduct,
    ref: str,
) -> dict[str, Any]:
    """Construit la row pour supplier_products."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "supplier_id": supplier_id,
        "product_id": product_id,
        "supplier_reference": ref or None,
        "supplier_price": merged.cost_price if merged.cost_price > 0 else 0.01,
        "stock_quantity": merged.stock_quantity if merged.stock_quantity > 0 else 0,
        "source_type": "liderpapel",
        "is_preferred": False,
        "updated_at": now,
    }


def build_attributes(product_id: str, merged: MergedProduct) -> list[dict[str, Any]]:
    """Construit les rows product_attributes (marque, couleur, format, matière)."""
    attrs: list[dict[str, Any]] = []
    mapping = [
        ("marque", "Marque", merged.brand),
        ("couleur", "Couleur", merged.color),
        ("format", "Format", merged.format),
        ("matiere", "Matière", merged.material),
        ("usage", "Usage", merged.usage),
    ]
    for attr_type, attr_name, value in mapping:
        if value:
            attrs.append({
                "product_id": product_id,
                "attribute_type": attr_type,
                "attribute_name": attr_name,
                "attribute_value": value,
                "source": "liderpapel",
            })
    return attrs
