"""Tests pour validator.py."""

import pytest

from agents.comlandi_import.validator import (
    validate_catalog,
    validate_prices,
    cross_validate,
    run_validation,
)
from agents.comlandi_import.models.product import CatalogProduct
from agents.comlandi_import.models.price import PriceProduct
from agents.comlandi_import.models.stock import StockProduct


class TestValidateCatalog:
    def test_missing_ean_warning(self):
        products = {"REF001": CatalogProduct(id="REF001", ean=None)}
        issues = validate_catalog(products)
        warnings = [i for i in issues if i.severity == "warning" and "EAN manquant" in i.message]
        assert len(warnings) == 1

    def test_empty_description_warning(self):
        products = {"REF001": CatalogProduct(id="REF001", description="")}
        issues = validate_catalog(products)
        warnings = [i for i in issues if "Description vide" in i.message]
        assert len(warnings) == 1

    def test_duplicate_ean_error(self):
        products = {
            "REF001": CatalogProduct(id="REF001", ean="4006381333931"),
            "REF002": CatalogProduct(id="REF002", ean="4006381333931"),
        }
        issues = validate_catalog(products)
        errors = [i for i in issues if i.severity == "error" and "dupliqué" in i.message]
        assert len(errors) == 1

    def test_valid_product(self):
        products = {
            "REF001": CatalogProduct(id="REF001", ean="4006381333931", description="OK"),
        }
        issues = validate_catalog(products)
        errors = [i for i in issues if i.severity == "error"]
        assert len(errors) == 0


class TestValidatePrices:
    def test_negative_cost_error(self):
        prices = {"REF001": PriceProduct(id="REF001", cost_price=-5.0)}
        issues = validate_prices(prices)
        errors = [i for i in issues if i.severity == "error"]
        assert len(errors) == 1

    def test_zero_price_warning(self):
        prices = {"REF001": PriceProduct(id="REF001", cost_price=0, suggested_price=0)}
        issues = validate_prices(prices)
        warnings = [i for i in issues if "Aucun prix" in i.message]
        assert len(warnings) == 1

    def test_cost_greater_than_suggested(self):
        prices = {"REF001": PriceProduct(id="REF001", cost_price=20.0, suggested_price=10.0)}
        issues = validate_prices(prices)
        warnings = [i for i in issues if ">" in i.message]
        assert len(warnings) == 1


class TestCrossValidate:
    def test_catalog_without_prices(self):
        catalog = {"REF001": CatalogProduct(id="REF001")}
        prices: dict = {}
        stocks: dict = {}
        issues = cross_validate(catalog, prices, stocks)
        warnings = [i for i in issues if "sans prix" in i.message]
        assert len(warnings) >= 1

    def test_prices_without_catalog(self):
        catalog: dict = {}
        prices = {"REF001": PriceProduct(id="REF001", cost_price=5.0)}
        stocks: dict = {}
        issues = cross_validate(catalog, prices, stocks)
        warnings = [i for i in issues if "sans entrée catalog" in i.message]
        assert len(warnings) >= 1

    def test_missing_images_info(self):
        catalog = {"REF001": CatalogProduct(id="REF001")}
        prices = {"REF001": PriceProduct(id="REF001", cost_price=5.0)}
        issues = cross_validate(catalog, prices, {}, multimedia={})
        infos = [i for i in issues if "sans image" in i.message]
        assert len(infos) == 1


class TestRunValidation:
    def test_valid_report(self):
        parsed = {
            "catalog": {"REF001": CatalogProduct(id="REF001", ean="4006381333931", description="OK")},
            "prices": {"REF001": PriceProduct(id="REF001", cost_price=5.0)},
            "stocks": {"REF001": StockProduct(id="REF001", available_quantity=10)},
        }
        report = run_validation(parsed)
        assert report.is_valid

    def test_invalid_report(self):
        parsed = {
            "catalog": {
                "REF001": CatalogProduct(id="REF001", ean="4006381333931"),
                "REF002": CatalogProduct(id="REF002", ean="4006381333931"),
            },
            "prices": {"REF001": PriceProduct(id="REF001", cost_price=-1.0)},
            "stocks": {},
        }
        report = run_validation(parsed)
        assert not report.is_valid
        assert report.error_count >= 1
