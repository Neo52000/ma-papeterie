"""Tests pour transformer.py — EAN, prix, merge."""

import pytest

from agents.comlandi_import.transformer import (
    compute_check_digit,
    is_valid_ean_check_digit,
    normalize_ean,
    normalize_ean_with_report,
    parse_num,
    clean_str,
    get_coefficient,
    calculate_prices,
    merge_all,
    build_product_row,
    build_attributes,
)
from agents.comlandi_import.models.product import CatalogProduct
from agents.comlandi_import.models.price import PriceProduct
from agents.comlandi_import.models.stock import StockProduct


class TestEanNormalization:
    def test_normalize_basic(self):
        assert normalize_ean("3505100735008") == "3505100735008"

    def test_normalize_pad_to_13(self):
        assert normalize_ean("50573500") == "0000050573500"

    def test_normalize_strip_non_digits(self):
        assert normalize_ean("350 510-073 5008") == "3505100735008"

    def test_normalize_none(self):
        assert normalize_ean(None) is None
        assert normalize_ean("") is None

    def test_normalize_too_short(self):
        assert normalize_ean("123") is None

    def test_normalize_too_long(self):
        assert normalize_ean("123456789012345") is None

    def test_strict_valid(self):
        # EAN-13: 4006381333931 has valid check digit
        assert normalize_ean("4006381333931", strict=True) == "4006381333931"

    def test_strict_invalid(self):
        assert normalize_ean("4006381333932", strict=True) is None

    def test_upc_12_digits(self):
        result = normalize_ean("012345678905")
        assert result is not None
        assert len(result) == 13

    def test_gtin_14_digits(self):
        result = normalize_ean("10012345678902")
        assert result is not None
        assert len(result) == 14  # Already >= 13, no padding


class TestCheckDigit:
    def test_compute(self):
        # EAN-13: 4006381333931 → check digit 1
        assert compute_check_digit("4006381333931") == 1

    def test_valid(self):
        assert is_valid_ean_check_digit("4006381333931") is True

    def test_invalid(self):
        assert is_valid_ean_check_digit("4006381333932") is False

    def test_invalid_format(self):
        assert is_valid_ean_check_digit("abc") is False


class TestEanWithReport:
    def test_valid(self):
        ean, warning = normalize_ean_with_report("4006381333931")
        assert ean == "4006381333931"
        assert warning is None

    def test_invalid_checkdigit(self):
        ean, warning = normalize_ean_with_report("4006381333932")
        assert ean == "4006381333932"
        assert warning is not None
        assert "chiffre de contrôle" in warning

    def test_too_short(self):
        ean, warning = normalize_ean_with_report("123")
        assert ean is None
        assert "longueur" in warning

    def test_none(self):
        ean, warning = normalize_ean_with_report(None)
        assert ean is None
        assert warning is None


class TestParseNum:
    def test_basic(self):
        assert parse_num("5.50") == 5.50

    def test_european_format(self):
        assert parse_num("1.234,56") == 1234.56

    def test_comma_decimal(self):
        assert parse_num("5,50") == 5.50

    def test_none(self):
        assert parse_num(None) == 0.0

    def test_empty(self):
        assert parse_num("") == 0.0

    def test_nd(self):
        assert parse_num("N/D") == 0.0

    def test_int(self):
        assert parse_num(42) == 42.0


class TestCleanStr:
    def test_basic(self):
        assert clean_str("  hello  ") == "hello"

    def test_none(self):
        assert clean_str(None) is None

    def test_empty(self):
        assert clean_str("") is None
        assert clean_str("   ") is None

    def test_nd(self):
        assert clean_str("N/D") is None


class TestGetCoefficient:
    def test_exact_match(self):
        coeffs = {"Bureau::Stylos": 1.8, "Bureau::": 2.0}
        assert get_coefficient(coeffs, "Bureau", "Stylos") == 1.8

    def test_family_fallback(self):
        coeffs = {"Bureau::": 2.5}
        assert get_coefficient(coeffs, "Bureau", "Inconnu") == 2.5

    def test_default(self):
        assert get_coefficient({}, "Bureau", "Stylos") == 2.0

    def test_no_family(self):
        assert get_coefficient({"Bureau::": 2.5}, None, None) == 2.0


class TestCalculatePrices:
    def test_with_suggested(self):
        ht, ttc, eco = calculate_prices(5.0, 12.90, 20.0, {}, 2.0)
        assert ttc == 12.90
        assert ht == round(12.90 / 1.20 * 100) / 100

    def test_with_cost_coefficient(self):
        ht, ttc, eco = calculate_prices(5.0, 0.0, 20.0, {}, 2.0)
        assert ht == 10.0
        assert ttc == 12.0

    def test_with_eco_tax(self):
        taxes = {"taxe_d3e": 0.10, "taxe_cop": 0.05}
        ht, ttc, eco = calculate_prices(5.0, 12.90, 20.0, taxes, 2.0)
        assert abs(eco - 0.15) < 1e-10
        assert ttc == round((12.90 + 0.15) * 100) / 100

    def test_no_price(self):
        ht, ttc, eco = calculate_prices(0.0, 0.0, 20.0, {}, 2.0)
        assert ht == 0.0
        assert ttc == 0.0


class TestMergeAll:
    def test_basic_merge(self):
        catalog = {
            "REF001": CatalogProduct(
                id="REF001", ean="3505100735008",
                description="Stylo BIC", family="Bureau", subfamily="Stylos",
                brand="BIC",
            )
        }
        prices = {
            "REF001": PriceProduct(id="REF001", cost_price=5.0, suggested_price=12.90, tva_rate=20.0)
        }
        stocks = {"REF001": StockProduct(id="REF001", available_quantity=100)}

        result = merge_all(catalog, prices, stocks, {})
        assert "REF001" in result
        m = result["REF001"]
        assert m.ean == "3505100735008"
        assert m.name == "Stylo BIC"
        assert m.stock_quantity == 100
        assert m.price_ttc == 12.90
        assert m.brand == "BIC"

    def test_skip_no_price(self):
        catalog = {"REF001": CatalogProduct(id="REF001", description="Test")}
        prices = {"REF001": PriceProduct(id="REF001", cost_price=0, suggested_price=0)}
        result = merge_all(catalog, prices, {}, {})
        assert "REF001" not in result

    def test_union_refs(self):
        catalog = {"REF001": CatalogProduct(id="REF001", description="A")}
        prices = {
            "REF001": PriceProduct(id="REF001", cost_price=5.0),
            "REF002": PriceProduct(id="REF002", cost_price=3.0),
        }
        result = merge_all(catalog, prices, {}, {})
        assert "REF001" in result
        assert "REF002" in result


class TestBuildProductRow:
    def test_basic(self):
        merged = CatalogProduct(id="REF001")  # Won't work, need MergedProduct
        from agents.comlandi_import.models.product import MergedProduct
        m = MergedProduct(
            reference="REF001", ean="3505100735008", name="Test",
            family="Bureau", subfamily="Stylos", brand="BIC",
            cost_price=5.0, price_ht=10.0, price_ttc=12.0, tva_rate=20.0,
            stock_quantity=50, is_active=True,
        )
        row = build_product_row(m)
        assert row["name"] == "Test"
        assert row["price_ht"] == 10.0
        assert row["price_ttc"] == 12.0
        assert row["attributs"]["ref_liderpapel"] == "REF001"
        assert row["stock_quantity"] == 50


class TestBuildAttributes:
    def test_with_brand(self):
        from agents.comlandi_import.models.product import MergedProduct
        m = MergedProduct(
            reference="REF001", name="Test",
            brand="BIC", color="Bleu", material="Plastique",
        )
        attrs = build_attributes("uuid-123", m)
        types = [a["attribute_type"] for a in attrs]
        assert "marque" in types
        assert "couleur" in types
        assert "matiere" in types
        assert all(a["source"] == "liderpapel" for a in attrs)

    def test_no_attributes(self):
        from agents.comlandi_import.models.product import MergedProduct
        m = MergedProduct(reference="REF001", name="Test")
        attrs = build_attributes("uuid-123", m)
        assert attrs == []
