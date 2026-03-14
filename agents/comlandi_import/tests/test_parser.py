"""Tests pour parser.py — JSON Comlandi v5.8."""

import pytest

from agents.comlandi_import.parser import (
    _ensure_list,
    _extract_product_list,
    parse_catalog,
    parse_categories,
    parse_descriptions,
    parse_multimedia,
    parse_prices,
    parse_relations,
    parse_stocks,
    parse_delivery_orders,
)


class TestHelpers:
    def test_ensure_list_none(self):
        assert _ensure_list(None) == []

    def test_ensure_list_single(self):
        assert _ensure_list({"id": "1"}) == [{"id": "1"}]

    def test_ensure_list_array(self):
        assert _ensure_list([1, 2]) == [1, 2]

    def test_extract_product_list_normal(self):
        data = {"root": {"Products": {"Product": [{"id": "A"}, {"id": "B"}]}}}
        result = _extract_product_list(data, "Products")
        assert len(result) == 2

    def test_extract_product_list_single_product(self):
        data = {"root": {"Products": {"Product": {"id": "A"}}}}
        result = _extract_product_list(data, "Products")
        assert len(result) == 1
        assert result[0]["id"] == "A"

    def test_extract_product_list_lowercase(self):
        data = {"root": {"products": {"Product": [{"id": "X"}]}}}
        result = _extract_product_list(data, "Products")
        assert len(result) == 1


class TestParseCatalog:
    def test_basic(self):
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF001",
                            "References": {
                                "Reference": [
                                    {"refCode": "EAN_UMV", "value": "3505100735008"},
                                    {"refCode": "FABRICANTE_GENERICO", "value": "MFG001"},
                                ]
                            },
                            "Classifications": {
                                "Classification": [
                                    {"level": "1", "name": "Écriture"},
                                    {"level": "2", "name": "Stylos"},
                                ]
                            },
                            "AdditionalInfo": {
                                "Brand": "BIC",
                                "Color": "Bleu",
                                "Description": "Stylo BIC bleu",
                            },
                            "Weight": "0.05",
                            "Validity": "1",
                        }
                    ]
                }
            }
        }
        result = parse_catalog(data)
        assert "REF001" in result
        p = result["REF001"]
        assert p.ean == "3505100735008"
        assert p.manufacturer_ref == "MFG001"
        assert p.family == "Écriture"
        assert p.subfamily == "Stylos"
        assert p.brand == "BIC"
        assert p.color == "Bleu"
        assert p.description == "Stylo BIC bleu"
        assert p.is_active is True

    def test_single_reference(self):
        """Comlandi sends single Reference as object, not array."""
        data = {
            "root": {
                "Products": {
                    "Product": {
                        "id": "REF002",
                        "References": {
                            "Reference": {"refCode": "EAN_UNITARIO", "value": "1234567890123"}
                        },
                        "AdditionalInfo": {},
                    }
                }
            }
        }
        result = parse_catalog(data)
        assert "REF002" in result
        assert result["REF002"].ean == "1234567890123"

    def test_inactive_product(self):
        data = {
            "root": {
                "Products": {
                    "Product": [{"id": "REF003", "Validity": "0", "AdditionalInfo": {}}]
                }
            }
        }
        result = parse_catalog(data)
        assert result["REF003"].is_active is False

    def test_mixed_case_aliases(self):
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF004",
                            "AdditionalInfo": {
                                "Marca": "Staedtler",
                                "Couleur": "Rouge",
                                "Matière": "Plastique",
                            },
                        }
                    ]
                }
            }
        }
        result = parse_catalog(data)
        p = result["REF004"]
        assert p.brand == "Staedtler"
        assert p.color == "Rouge"
        assert p.material == "Plastique"


class TestParsePrices:
    def test_basic(self):
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF001",
                            "Prices": {
                                "Price": [
                                    {
                                        "priceType": "purchase",
                                        "PriceLines": {
                                            "PriceLine": [
                                                {"PriceExcTax": "5.50", "MinQuantity": "1"}
                                            ]
                                        },
                                        "AddTaxes": {
                                            "AddTax": [
                                                {"taxCode": "D3E", "value": "0.10"},
                                                {"taxCode": "COP", "value": "0.05"},
                                            ]
                                        },
                                    },
                                    {
                                        "priceType": "suggestedCI",
                                        "PriceLines": {
                                            "PriceLine": {"PriceExcTax": "12.90", "MinQuantity": "1"}
                                        },
                                    },
                                ]
                            },
                            "VATRates": {
                                "VATRate": [
                                    {"country": "FR", "value": "20"},
                                    {"country": "ES", "value": "21"},
                                ]
                            },
                        }
                    ]
                }
            }
        }
        result = parse_prices(data)
        assert "REF001" in result
        p = result["REF001"]
        assert p.cost_price == 5.50
        assert p.suggested_price == 12.90
        assert p.tva_rate == 20.0
        assert p.taxes["taxe_d3e"] == 0.10
        assert p.taxes["taxe_cop"] == 0.05

    def test_single_vat_rate(self):
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF002",
                            "Prices": {
                                "Price": {
                                    "priceType": "purchase",
                                    "PriceLines": {
                                        "PriceLine": {"PriceExcTax": 3.20, "MinQuantity": 1}
                                    },
                                }
                            },
                            "VATRates": {"VATRate": {"country": "FR", "value": 5.5}},
                        }
                    ]
                }
            }
        }
        result = parse_prices(data)
        assert result["REF002"].tva_rate == 5.5
        assert result["REF002"].cost_price == 3.20


class TestParseStocks:
    def test_basic(self):
        data = {
            "root": {
                "Storage": {
                    "Stocks": [
                        {
                            "Products": {
                                "Product": [
                                    {"id": "REF001", "Stock": {"AvailableQuantity": "150"}},
                                    {"id": "REF002", "Stock": {"AvailableQuantity": 0}},
                                ]
                            }
                        }
                    ]
                }
            }
        }
        result = parse_stocks(data)
        assert result["REF001"].available_quantity == 150
        assert result["REF002"].available_quantity == 0

    def test_single_stock(self):
        data = {
            "root": {
                "Storage": {
                    "Stocks": {
                        "Products": {
                            "Product": {"id": "REF003", "Stock": {"AvailableQuantity": "42"}}
                        }
                    }
                }
            }
        }
        result = parse_stocks(data)
        assert result["REF003"].available_quantity == 42


class TestParseCategories:
    def test_basic(self):
        data = {
            "root": {
                "Categories": {
                    "Category": [
                        {
                            "code": "100",
                            "level": "1",
                            "Texts": [{"lang": "fr_FR", "value": "Bureau"}],
                        },
                        {
                            "code": "101",
                            "level": "2",
                            "parentCode": "100",
                            "Texts": [
                                {"lang": "es_ES", "value": "Bolígrafos"},
                                {"lang": "fr_FR", "value": "Stylos"},
                            ],
                        },
                    ]
                }
            }
        }
        result = parse_categories(data)
        assert len(result) == 2
        assert result[0].name == "Bureau"
        assert result[1].name == "Stylos"
        assert result[1].parent_code == "100"


class TestParseDescriptions:
    def test_basic(self):
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF001",
                            "Descriptions": {
                                "Description": [
                                    {
                                        "DescCode": "INT_VTE",
                                        "Texts": {"Text": {"lang": "fr", "value": "Titre SEO"}},
                                    },
                                    {
                                        "DescCode": "MINI_DESC",
                                        "Texts": {"Text": [{"lang": "fr", "value": "Court"}]},
                                    },
                                    {
                                        "DescCode": "TXT_RCOM",
                                        "Texts": {"Text": {"lang": "fr", "value": "Long texte"}},
                                    },
                                ]
                            },
                        }
                    ]
                }
            }
        }
        result = parse_descriptions(data)
        assert "REF001" in result
        assert result["REF001"]["meta_title"] == "Titre SEO"
        assert result["REF001"]["description_courte"] == "Court"
        assert result["REF001"]["description_longue"] == "Long texte"

    def test_ampl_desc_fallback(self):
        """AMPL_DESC is fallback for description_longue only if TXT_RCOM missing."""
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF002",
                            "Descriptions": {
                                "Description": [
                                    {
                                        "DescCode": "AMPL_DESC",
                                        "Texts": {"Text": {"lang": "fr", "value": "Texte AMPL"}},
                                    },
                                ]
                            },
                        }
                    ]
                }
            }
        }
        result = parse_descriptions(data)
        assert result["REF002"]["description_longue"] == "Texte AMPL"


class TestParseMultimedia:
    def test_basic(self):
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF001",
                            "MultimediaLinks": {
                                "MultimediaLink": [
                                    {"mmlType": "IMG", "Url": "https://img.com/1.jpg", "Active": True},
                                    {"mmlType": "IMG", "Url": "https://img.com/2.jpg", "Active": True},
                                    {"mmlType": "VID", "Url": "https://vid.com/1.mp4", "Active": True},
                                    {"mmlType": "IMG", "Url": "https://img.com/3.jpg", "Active": False},
                                ]
                            },
                        }
                    ]
                }
            }
        }
        result = parse_multimedia(data)
        assert "REF001" in result
        assert len(result["REF001"]) == 2  # Only active IMG
        assert result["REF001"][0].url == "https://img.com/1.jpg"
        assert result["REF001"][0].order == 0
        assert result["REF001"][1].order == 1


class TestParseRelations:
    def test_basic(self):
        data = {
            "root": {
                "Products": {
                    "Product": [
                        {
                            "id": "REF001",
                            "RelationedProducts": {
                                "RelationedProduct": [
                                    {"id": "REF002", "type": "color"},
                                    {"id": "REF003", "type": "alternative"},
                                ]
                            },
                        }
                    ]
                }
            }
        }
        result = parse_relations(data)
        assert len(result) == 2
        assert result[0].product_id == "REF001"
        assert result[0].related_product_id == "REF002"
        assert result[0].relation_type == "color"


class TestParseDeliveryOrders:
    def test_basic(self):
        data = {
            "root": {
                "DeliveryOrders": {
                    "DeliveryOrder": {
                        "deliveryOrderCode": "DO001",
                        "Date": "2024-01-15",
                        "Order": {"Code": "ORD001", "OwnCode": "OWN001"},
                        "Transport": {"TransportName": "DHL"},
                        "Subtotal": "100.00",
                        "Taxes": "20.00",
                        "Total": "120.00",
                        "Lines": {
                            "Line": [
                                {
                                    "Product": {"Reference": "REF001", "Description": "Stylo"},
                                    "Quantity": "10",
                                    "Price": "5.00",
                                    "Amount": "50.00",
                                }
                            ]
                        },
                    }
                }
            }
        }
        result = parse_delivery_orders(data)
        assert len(result) == 1
        assert result[0]["code"] == "DO001"
        assert result[0]["total"] == 120.0
        assert len(result[0]["lines"]) == 1
