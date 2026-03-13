"""Parsers JSON Comlandi v5.8 — port fidèle du TypeScript."""

from __future__ import annotations

import logging
from typing import Any

from .config import ADDITIONAL_INFO_ALIASES, DESC_CODE_MAP, EAN_REF_CODES
from .models.category import Category
from .models.media import MultimediaLink
from .models.price import PriceProduct
from .models.product import CatalogProduct
from .models.relation import ProductRelation
from .models.stock import StockProduct

log = logging.getLogger(__name__)


# ─── Helpers ───


def _ensure_list(val: Any) -> list:
    """Comlandi envoie un objet unique OU un array — normaliser."""
    if val is None:
        return []
    return val if isinstance(val, list) else [val]


def _extract_product_list(json_data: dict, container_key: str) -> list[dict]:
    """Navigate root.{key}.Product[] ou root.{key}[0].Product[]."""
    root = json_data.get("root", json_data)
    container = root.get(container_key) or root.get(container_key.lower()) or root
    if isinstance(container, list):
        container = container[0] if container else {}
    products = container.get("Product") or container.get("product") or []
    return _ensure_list(products)


def _get_alias(info: dict, aliases: list[str]) -> str:
    """Cherche la première clé présente dans info parmi les aliases."""
    for alias in aliases:
        val = info.get(alias)
        if val is not None:
            return str(val)
    return ""


def _parse_num(val: Any) -> float:
    """Parse un nombre depuis une valeur (str/int/float). Format européen supporté."""
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s or s == "N/D":
        return 0.0
    # Format européen : 1.234,56 → 1234.56
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


# ─── Catalog Parser ───


def parse_catalog(json_data: dict) -> dict[str, CatalogProduct]:
    """Parse Catalog JSON → {comlandi_ref: CatalogProduct}.

    Port de parseCatalogJson (TS:87-153).
    """
    products = _extract_product_list(json_data, "Products")
    result: dict[str, CatalogProduct] = {}

    for p in products:
        pid = str(p.get("id", ""))
        if not pid:
            continue

        # EAN from References (priorité EAN_UMV > EAN_UNITARIO > EAN_UNIDAD)
        ean = ""
        manufacturer_ref = ""
        refs = _ensure_list(p.get("References", {}).get("Reference"))
        for ref in refs:
            if isinstance(ref, dict):
                code = ref.get("refCode") or ref.get("RefCode") or ""
                val = ref.get("value") or ref.get("Value") or str(ref)
            else:
                continue
            if code in EAN_REF_CODES and not ean:
                ean = val
            if code == "FABRICANTE_GENERICO":
                manufacturer_ref = val

        # Family/subfamily from Classifications
        family = ""
        subfamily = ""
        classifs = _ensure_list(
            p.get("Classifications", {}).get("Classification")
        )
        for c in classifs:
            level = str(c.get("level") or c.get("Level") or "")
            name = c.get("name") or c.get("Name") or ""
            if level in ("1", "family", "Family"):
                family = name
            if level in ("2", "subfamily", "SubFamily"):
                subfamily = name

        # AdditionalInfo with aliases
        add_info = p.get("AdditionalInfo") or {}
        brand = _get_alias(add_info, ADDITIONAL_INFO_ALIASES["brand"])
        color = _get_alias(add_info, ADDITIONAL_INFO_ALIASES["color"])
        fmt = _get_alias(add_info, ADDITIONAL_INFO_ALIASES["format"])
        material = _get_alias(add_info, ADDITIONAL_INFO_ALIASES["material"])
        usage = _get_alias(add_info, ADDITIONAL_INFO_ALIASES["usage"])
        desc = _get_alias(add_info, ADDITIONAL_INFO_ALIASES["description"])

        weight = str(p.get("Weight") or add_info.get("Weight") or "")
        country = str(p.get("CountryOfOrigin") or add_info.get("CountryOfOrigin") or "")
        customs = str(p.get("CustomsCode") or add_info.get("CustomsCode") or "")
        validity = str(p.get("Validity", "1"))
        is_active = validity != "0"

        result[pid] = CatalogProduct(
            id=pid,
            ean=ean or None,
            manufacturer_ref=manufacturer_ref or None,
            description=desc,
            family=family,
            subfamily=subfamily,
            brand=brand,
            color=color,
            format=fmt,
            material=material,
            usage=usage,
            weight_kg=weight,
            country_origin=country,
            customs_code=customs,
            is_active=is_active,
            additional_info=add_info,
        )

    log.info(f"Catalog: {len(result)} produits parsés")
    return result


# ─── Prices Parser ───


def parse_prices(json_data: dict) -> dict[str, PriceProduct]:
    """Parse Prices JSON → {comlandi_ref: PriceProduct}.

    Port de parsePricesJson (TS:155-230).
    """
    products = _extract_product_list(json_data, "Products")
    result: dict[str, PriceProduct] = {}

    for p in products:
        pid = str(p.get("id", ""))
        if not pid:
            continue

        cost_price = 0.0
        suggested_price = 0.0
        tva_rate = 0.0
        taxes: dict[str, float] = {}

        # Parse Prices container
        prices_container = p.get("Prices")
        if isinstance(prices_container, list):
            prices_container = prices_container[0] if prices_container else {}
        price_list = _ensure_list((prices_container or {}).get("Price"))

        for price in price_list:
            price_type = price.get("priceType", "")
            lines = _ensure_list(
                (price.get("PriceLines") or {}).get("PriceLine")
            )

            # Get base price (MinQuantity <= 1 or first line)
            base_price = 0.0
            for line in lines:
                min_qty = _parse_num(line.get("MinQuantity", 0))
                price_val = _parse_num(line.get("PriceExcTax", 0))
                if min_qty <= 1 or base_price == 0.0:
                    base_price = price_val

            if price_type == "purchase":
                cost_price = base_price
                # Extract AddTaxes (COP, D3E, MOB, SCM, SOD)
                add_taxes = _ensure_list(
                    (price.get("AddTaxes") or {}).get("AddTax")
                )
                for tax in add_taxes:
                    code = str(tax.get("taxCode", "")).upper()
                    val = _parse_num(tax.get("value", tax))
                    if "COP" in code:
                        taxes["taxe_cop"] = val
                    if "D3E" in code:
                        taxes["taxe_d3e"] = val
                    if "MOB" in code:
                        taxes["taxe_mob"] = val
                    if "SCM" in code:
                        taxes["taxe_scm"] = val
                    if "SOD" in code:
                        taxes["taxe_sod"] = val

            elif price_type in ("suggestedCI", "suggested", "suggestedSco", "suggestedPVC"):
                if suggested_price == 0.0:
                    suggested_price = base_price

        # Parse VATRates (priorité FR)
        vat_rates = _ensure_list(
            (p.get("VATRates") or {}).get("VATRate")
        )
        for vat in vat_rates:
            if isinstance(vat, dict):
                country = vat.get("country", "")
                val = _parse_num(vat.get("Value") or vat.get("value", vat))
                if country == "FR" or tva_rate == 0.0:
                    tva_rate = val
            else:
                tva_rate = _parse_num(vat)

        result[pid] = PriceProduct(
            id=pid,
            cost_price=cost_price,
            suggested_price=suggested_price,
            tva_rate=tva_rate,
            taxes=taxes,
        )

    log.info(f"Prices: {len(result)} produits parsés")
    return result


# ─── Stocks Parser ───


def parse_stocks(json_data: dict) -> dict[str, StockProduct]:
    """Parse Stocks JSON → {comlandi_ref: StockProduct}.

    Port de parseStocksJson (TS:232-258).
    Root différent: Storage.Stocks[].Products.Product[]
    """
    root = json_data.get("root", json_data)
    storage = root.get("Storage") or root.get("storage") or root
    stocks_arr = _ensure_list(storage.get("Stocks") or storage.get("stocks"))
    result: dict[str, StockProduct] = {}

    for stocks in stocks_arr:
        products_container = stocks.get("Products") or stocks.get("products") or {}
        product_list = _ensure_list(
            products_container.get("Product") or products_container.get("product")
        )

        for p in product_list:
            pid = str(p.get("id", ""))
            if not pid:
                continue

            stock = p.get("Stock") or p.get("stock") or {}
            qty = int(_parse_num(
                stock.get("AvailableQuantity") or stock.get("availableQuantity") or 0
            ))

            result[pid] = StockProduct(id=pid, available_quantity=qty)

    log.info(f"Stocks: {len(result)} produits parsés")
    return result


# ─── Categories Parser ───


def parse_categories(json_data: dict) -> list[Category]:
    """Parse Categories JSON → [Category].

    Port de parseCategoriesJson (TS:270-287).
    """
    root = json_data.get("root", json_data)
    container = root.get("Categories") or root.get("categories") or root
    cats = _ensure_list(container.get("Category") or container.get("category"))
    result: list[Category] = []

    for c in cats:
        code = str(c.get("code", ""))
        if not code:
            continue

        # Get French name from Texts
        texts = _ensure_list(c.get("Texts") or c.get("texts"))
        fr_text = None
        first_text = None
        for t in texts:
            if isinstance(t, dict):
                if first_text is None:
                    first_text = t
                lang = t.get("lang", "")
                if str(lang).startswith("fr"):
                    fr_text = t
                    break

        text_obj = fr_text or first_text or {}
        name = text_obj.get("value") or text_obj.get("Value") or ""

        result.append(Category(
            code=code,
            name=name,
            level=str(c.get("level", "1")),
            parent_code=c.get("parentCode") or None,
        ))

    log.info(f"Categories: {len(result)} catégories parsées")
    return result


# ─── Descriptions Parser ───


def parse_descriptions(json_data: dict) -> dict[str, dict[str, str]]:
    """Parse Descriptions JSON → {comlandi_ref: {field_name: text_value}}.

    Port de la logique enrichment (TS:489-547).
    """
    products = _extract_product_list(json_data, "Products")
    result: dict[str, dict[str, str]] = {}

    for p in products:
        pid = str(p.get("id", ""))
        if not pid:
            continue

        descs = _ensure_list(
            (p.get("Descriptions") or p.get("descriptions") or {}).get("Description")
        )

        fields: dict[str, str] = {}
        for desc in descs:
            code = desc.get("DescCode") or desc.get("descCode") or ""
            texts = _ensure_list(
                (desc.get("Texts") or desc.get("texts") or {}).get("Text")
            )

            # Prefer French, fallback to first
            fr_text = None
            first_text = None
            for t in texts:
                if isinstance(t, dict):
                    if first_text is None:
                        first_text = t
                    lang = t.get("lang") or t.get("Lang") or ""
                    if str(lang).startswith("fr"):
                        fr_text = t
                        break
                elif isinstance(t, str):
                    if first_text is None:
                        first_text = {"value": t}

            text_obj = fr_text or first_text or {}
            if isinstance(text_obj, dict):
                value = text_obj.get("value") or text_obj.get("Value") or text_obj.get("#text") or ""
            elif isinstance(text_obj, str):
                value = text_obj
            else:
                value = ""

            if not value or code not in DESC_CODE_MAP:
                continue

            target_field = DESC_CODE_MAP[code]

            # AMPL_DESC is fallback for description_longue
            if code == "AMPL_DESC" and "description_longue" in fields:
                continue
            # DETAILED/COMP/TECH_SHEET/DETALLADA are fallback for description_detaillee
            if code in ("DETAILED", "COMP", "TECH_SHEET", "DETALLADA") and "description_detaillee" in fields:
                continue

            fields[target_field] = value

        if fields:
            result[pid] = fields

    log.info(f"Descriptions: {len(result)} produits avec descriptions")
    return result


# ─── Multimedia Parser ───


def parse_multimedia(json_data: dict) -> dict[str, list[MultimediaLink]]:
    """Parse MultimediaLinks JSON → {comlandi_ref: [MultimediaLink]}.

    Port de la logique enrichment (TS:549-582). Filtre IMG actives.
    """
    products = _extract_product_list(json_data, "Products")
    result: dict[str, list[MultimediaLink]] = {}

    for p in products:
        pid = str(p.get("id", ""))
        if not pid:
            continue

        links_container = (
            p.get("MultimediaLinks") or p.get("multimediaLinks") or {}
        )
        links = _ensure_list(
            links_container.get("MultimediaLink") or links_container.get("multimediaLink")
        )

        product_links: list[MultimediaLink] = []
        order = 0
        for link in links:
            mml_type = str(link.get("mmlType") or link.get("MmlType") or "").upper()
            active = link.get("Active", True)
            if active == "false" or active is False:
                active = False
            else:
                active = True

            if mml_type != "IMG" or not active:
                continue

            url = link.get("Url") or link.get("url") or ""
            if not url:
                continue

            product_links.append(MultimediaLink(
                product_id=pid,
                url=url,
                mml_type=mml_type,
                order=order,
                name=link.get("Name") or link.get("name") or None,
                active=True,
            ))
            order += 1

        if product_links:
            result[pid] = product_links

    log.info(f"Multimedia: {len(result)} produits avec images")
    return result


# ─── Relations Parser ───


def parse_relations(json_data: dict) -> list[ProductRelation]:
    """Parse RelationedProducts JSON → [ProductRelation].

    Port de TS:615-642.
    """
    products = _extract_product_list(json_data, "Products")
    result: list[ProductRelation] = []

    for p in products:
        pid = str(p.get("id", ""))
        if not pid:
            continue

        rels_container = (
            p.get("RelationedProducts") or p.get("relationedProducts") or {}
        )
        rels = _ensure_list(
            rels_container.get("RelationedProduct") or rels_container.get("relationedProduct")
        )

        for rel in rels:
            related_id = str(rel.get("id") or rel.get("Id") or "")
            rel_type = rel.get("type") or rel.get("Type") or rel.get("relationType") or "alternative"
            if not related_id:
                continue
            result.append(ProductRelation(
                product_id=pid,
                related_product_id=related_id,
                relation_type=rel_type,
            ))

    log.info(f"Relations: {len(result)} relations parsées")
    return result


# ─── Delivery Orders Parser ───


def parse_delivery_orders(json_data: dict) -> list[dict]:
    """Parse DeliveryOrders JSON → [dict].

    Port de parseDeliveryOrdersJson (TS:289-319).
    """
    root = json_data.get("root", json_data)
    container = root.get("DeliveryOrders") or root.get("deliveryOrders") or root
    orders = _ensure_list(container.get("DeliveryOrder") or container.get("deliveryOrder"))
    result: list[dict] = []

    for o in orders:
        lines = _ensure_list((o.get("Lines") or {}).get("Line"))
        result.append({
            "code": o.get("deliveryOrderCode", ""),
            "date": o.get("Date", ""),
            "order_code": (o.get("Order") or {}).get("Code", ""),
            "own_code": (o.get("Order") or {}).get("OwnCode", ""),
            "transport": (o.get("Transport") or {}).get("TransportName", ""),
            "packages": o.get("Packages", ""),
            "subtotal": _parse_num(o.get("Subtotal", 0)),
            "taxes": _parse_num(o.get("Taxes", 0)),
            "total": _parse_num(o.get("Total", 0)),
            "lines_count": len(lines),
            "lines": [
                {
                    "reference": (line.get("Product") or {}).get("Reference", ""),
                    "description": (line.get("Product") or {}).get("Description", ""),
                    "quantity": line.get("Quantity", ""),
                    "price": line.get("Price", ""),
                    "amount": line.get("Amount", ""),
                }
                for line in lines[:100]
            ],
        })

    log.info(f"DeliveryOrders: {len(result)} bons de livraison parsés")
    return result
