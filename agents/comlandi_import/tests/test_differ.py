"""Tests pour differ.py."""

import json
import pytest
from pathlib import Path

from agents.comlandi_import.differ import (
    compute_diff,
    load_previous_state,
    save_current_state,
)
from agents.comlandi_import.models.product import MergedProduct


class TestComputeDiff:
    def test_no_previous(self):
        current = {
            "REF001": MergedProduct(reference="REF001", name="A", cost_price=5.0, price_ttc=12.0),
        }
        result = compute_diff(current, None)
        assert result.new_products == ["REF001"]
        assert result.removed_products == []
        assert result.price_changes == []

    def test_new_product(self):
        current = {
            "REF001": MergedProduct(reference="REF001", name="A", cost_price=5.0, price_ttc=12.0),
            "REF002": MergedProduct(reference="REF002", name="B", cost_price=3.0, price_ttc=7.0),
        }
        previous = {"REF001": {"cost_price": 5.0, "price_ttc": 12.0, "stock_qty": 0}}
        result = compute_diff(current, previous)
        assert "REF002" in result.new_products
        assert result.removed_products == []

    def test_removed_product(self):
        current = {
            "REF001": MergedProduct(reference="REF001", name="A", cost_price=5.0, price_ttc=12.0),
        }
        previous = {
            "REF001": {"cost_price": 5.0, "price_ttc": 12.0, "stock_qty": 0},
            "REF002": {"cost_price": 3.0, "price_ttc": 7.0, "stock_qty": 0},
        }
        result = compute_diff(current, previous)
        assert "REF002" in result.removed_products

    def test_price_change(self):
        current = {
            "REF001": MergedProduct(reference="REF001", name="A", cost_price=6.0, price_ttc=14.0),
        }
        previous = {"REF001": {"cost_price": 5.0, "price_ttc": 12.0, "stock_qty": 10}}
        result = compute_diff(current, previous)
        assert len(result.price_changes) == 1
        pc = result.price_changes[0]
        assert pc.old_cost == 5.0
        assert pc.new_cost == 6.0
        assert pc.old_ttc == 12.0
        assert pc.new_ttc == 14.0
        assert pc.pct_change > 0

    def test_stock_change(self):
        current = {
            "REF001": MergedProduct(
                reference="REF001", name="A",
                cost_price=5.0, price_ttc=12.0, stock_quantity=50,
            ),
        }
        previous = {"REF001": {"cost_price": 5.0, "price_ttc": 12.0, "stock_qty": 10}}
        result = compute_diff(current, previous)
        assert len(result.stock_changes) == 1
        assert result.stock_changes[0].old_qty == 10
        assert result.stock_changes[0].new_qty == 50

    def test_no_changes(self):
        current = {
            "REF001": MergedProduct(
                reference="REF001", name="A",
                cost_price=5.0, price_ttc=12.0, stock_quantity=10,
            ),
        }
        previous = {"REF001": {"cost_price": 5.0, "price_ttc": 12.0, "stock_qty": 10}}
        result = compute_diff(current, previous)
        assert result.new_products == []
        assert result.removed_products == []
        assert result.price_changes == []
        assert result.stock_changes == []


class TestStateStorage:
    def test_save_and_load(self, tmp_path: Path):
        state_dir = tmp_path / ".state"
        products = {
            "REF001": MergedProduct(
                reference="REF001", ean="1234567890123", name="A",
                cost_price=5.0, price_ttc=12.0, stock_quantity=10,
                family="Bureau",
            ),
        }

        save_current_state(state_dir, products)
        loaded = load_previous_state(state_dir)

        assert loaded is not None
        assert "REF001" in loaded
        assert loaded["REF001"]["cost_price"] == 5.0
        assert loaded["REF001"]["ean"] == "1234567890123"

    def test_rotation(self, tmp_path: Path):
        state_dir = tmp_path / ".state"
        products1 = {"REF001": MergedProduct(reference="REF001", name="V1", cost_price=5.0, price_ttc=10.0)}
        products2 = {"REF001": MergedProduct(reference="REF001", name="V2", cost_price=6.0, price_ttc=12.0)}

        save_current_state(state_dir, products1)
        save_current_state(state_dir, products2)

        # last_import.json should be V2
        loaded = load_previous_state(state_dir)
        assert loaded["REF001"]["cost_price"] == 6.0

        # prev_import.json should be V1
        prev_file = state_dir / "prev_import.json"
        assert prev_file.exists()
        with open(prev_file) as f:
            prev = json.load(f)
        assert prev["REF001"]["cost_price"] == 5.0

    def test_load_missing(self, tmp_path: Path):
        result = load_previous_state(tmp_path / "nonexistent")
        assert result is None
