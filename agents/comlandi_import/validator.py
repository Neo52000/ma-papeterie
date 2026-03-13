"""Validation des données Comlandi : structure JSON, règles métier, cross-validation."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from .models.category import Category
from .models.media import MultimediaLink
from .models.price import PriceProduct
from .models.product import CatalogProduct
from .models.stock import StockProduct
from .transformer import normalize_ean, is_valid_ean_check_digit

log = logging.getLogger(__name__)


@dataclass
class ValidationIssue:
    severity: str  # "error" | "warning" | "info"
    file_type: str
    reference: str | None
    message: str


@dataclass
class ValidationReport:
    issues: list[ValidationIssue] = field(default_factory=list)
    file_stats: dict[str, int] = field(default_factory=dict)

    @property
    def is_valid(self) -> bool:
        """True si aucune erreur (warnings OK)."""
        return not any(i.severity == "error" for i in self.issues)

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "warning")

    @property
    def info_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "info")


def validate_json_structure(json_data: dict, file_type: str) -> list[ValidationIssue]:
    """Vérifie la structure racine du JSON."""
    issues: list[ValidationIssue] = []
    if not isinstance(json_data, dict):
        issues.append(ValidationIssue("error", file_type, None, "Le JSON n'est pas un objet"))
        return issues

    root = json_data.get("root", json_data)
    if file_type == "catalog" and not (root.get("Products") or root.get("products")):
        issues.append(ValidationIssue("error", file_type, None, "Clé 'Products' manquante"))
    elif file_type == "prices" and not (root.get("Products") or root.get("products")):
        issues.append(ValidationIssue("error", file_type, None, "Clé 'Products' manquante"))
    elif file_type == "stocks" and not (root.get("Storage") or root.get("storage")):
        issues.append(ValidationIssue("error", file_type, None, "Clé 'Storage' manquante"))
    elif file_type == "categories" and not (root.get("Categories") or root.get("categories")):
        issues.append(ValidationIssue("warning", file_type, None, "Clé 'Categories' manquante"))

    return issues


def validate_catalog(products: dict[str, CatalogProduct]) -> list[ValidationIssue]:
    """Valide les produits du catalogue."""
    issues: list[ValidationIssue] = []
    ean_map: dict[str, list[str]] = {}

    for ref, p in products.items():
        # EAN manquant
        if not p.ean:
            issues.append(ValidationIssue("warning", "catalog", ref, "EAN manquant"))
        else:
            # Check EAN validity
            normalized = normalize_ean(p.ean)
            if normalized and not is_valid_ean_check_digit(normalized):
                issues.append(ValidationIssue(
                    "warning", "catalog", ref,
                    f"EAN avec chiffre de contrôle invalide: {p.ean}",
                ))
            # Track duplicates
            if normalized:
                ean_map.setdefault(normalized, []).append(ref)

        # Description vide
        if not p.description:
            issues.append(ValidationIssue("warning", "catalog", ref, "Description vide"))

    # EAN dupliqués
    for ean, refs in ean_map.items():
        if len(refs) > 1:
            issues.append(ValidationIssue(
                "error", "catalog", None,
                f"EAN {ean} dupliqué sur {len(refs)} produits: {', '.join(refs[:5])}",
            ))

    return issues


def validate_prices(prices: dict[str, PriceProduct]) -> list[ValidationIssue]:
    """Valide les données prix."""
    issues: list[ValidationIssue] = []

    for ref, p in prices.items():
        if p.cost_price < 0:
            issues.append(ValidationIssue("error", "prices", ref, f"Prix d'achat négatif: {p.cost_price}"))
        if p.suggested_price < 0:
            issues.append(ValidationIssue("error", "prices", ref, f"Prix conseillé négatif: {p.suggested_price}"))
        if p.cost_price == 0 and p.suggested_price == 0:
            issues.append(ValidationIssue("warning", "prices", ref, "Aucun prix (cost=0, suggested=0)"))
        if p.cost_price > 0 and p.suggested_price > 0 and p.cost_price > p.suggested_price:
            issues.append(ValidationIssue(
                "warning", "prices", ref,
                f"Prix d'achat ({p.cost_price}) > prix conseillé ({p.suggested_price})",
            ))

    return issues


def cross_validate(
    catalog: dict[str, CatalogProduct],
    prices: dict[str, PriceProduct],
    stocks: dict[str, StockProduct],
    descriptions: dict[str, dict[str, str]] | None = None,
    multimedia: dict[str, list[MultimediaLink]] | None = None,
) -> list[ValidationIssue]:
    """Cross-validation entre les différents fichiers."""
    issues: list[ValidationIssue] = []

    catalog_refs = set(catalog.keys())
    price_refs = set(prices.keys())
    stock_refs = set(stocks.keys())

    # Produits dans catalog sans prix
    no_price = catalog_refs - price_refs
    if no_price:
        issues.append(ValidationIssue(
            "warning", "cross", None,
            f"{len(no_price)} produits dans catalog sans prix",
        ))

    # Produits dans prices sans catalog
    orphan_prices = price_refs - catalog_refs
    if orphan_prices:
        issues.append(ValidationIssue(
            "warning", "cross", None,
            f"{len(orphan_prices)} produits dans prices sans entrée catalog",
        ))

    # Produits actifs sans prix
    active_no_price = [
        ref for ref in no_price
        if catalog[ref].is_active
    ]
    if active_no_price:
        issues.append(ValidationIssue(
            "warning", "cross", None,
            f"{len(active_no_price)} produits actifs sans prix",
        ))

    # Produits sans description
    if descriptions is not None:
        no_desc = catalog_refs - set(descriptions.keys())
        if no_desc:
            issues.append(ValidationIssue(
                "info", "cross", None,
                f"{len(no_desc)} produits sans description enrichie",
            ))

    # Produits sans image
    if multimedia is not None:
        no_img = catalog_refs - set(multimedia.keys())
        if no_img:
            issues.append(ValidationIssue(
                "info", "cross", None,
                f"{len(no_img)} produits sans image",
            ))

    return issues


def run_validation(parsed_data: dict[str, Any]) -> ValidationReport:
    """Exécute toutes les validations et agrège les résultats."""
    report = ValidationReport()
    all_issues: list[ValidationIssue] = []

    catalog = parsed_data.get("catalog", {})
    prices = parsed_data.get("prices", {})
    stocks = parsed_data.get("stocks", {})
    descriptions = parsed_data.get("descriptions")
    multimedia = parsed_data.get("multimedia")

    # File stats
    report.file_stats = {
        "catalog": len(catalog),
        "prices": len(prices),
        "stocks": len(stocks),
    }
    if descriptions is not None:
        report.file_stats["descriptions"] = len(descriptions)
    if multimedia is not None:
        report.file_stats["multimedia"] = len(multimedia)

    # Individual validations
    if catalog:
        all_issues.extend(validate_catalog(catalog))
    if prices:
        all_issues.extend(validate_prices(prices))

    # Cross-validation
    if catalog and prices:
        all_issues.extend(cross_validate(
            catalog, prices, stocks,
            descriptions=descriptions,
            multimedia=multimedia,
        ))

    report.issues = all_issues

    log.info(
        f"Validation: {report.error_count} erreurs, "
        f"{report.warning_count} warnings, {report.info_count} infos"
    )

    return report
