"""Diff engine : compare l'import courant avec l'état précédent."""

from __future__ import annotations

import json
import logging
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from .models.product import MergedProduct

log = logging.getLogger(__name__)


@dataclass
class PriceChange:
    reference: str
    ean: str | None
    old_cost: float
    new_cost: float
    old_ttc: float
    new_ttc: float
    pct_change: float


@dataclass
class StockChange:
    reference: str
    old_qty: int
    new_qty: int


@dataclass
class DiffResult:
    new_products: list[str] = field(default_factory=list)
    removed_products: list[str] = field(default_factory=list)
    price_changes: list[PriceChange] = field(default_factory=list)
    stock_changes: list[StockChange] = field(default_factory=list)

    @property
    def summary(self) -> dict[str, int]:
        return {
            "new": len(self.new_products),
            "removed": len(self.removed_products),
            "price_changes": len(self.price_changes),
            "stock_changes": len(self.stock_changes),
        }


def load_previous_state(state_dir: Path) -> dict[str, dict] | None:
    """Charge l'état du dernier import depuis state_dir/last_import.json."""
    state_file = state_dir / "last_import.json"
    if not state_file.exists():
        log.info("Pas d'état précédent trouvé")
        return None
    try:
        with open(state_file) as f:
            data = json.load(f)
        log.info(f"État précédent chargé: {len(data)} produits")
        return data
    except Exception as e:
        log.warning(f"Erreur chargement état précédent: {e}")
        return None


def save_current_state(
    state_dir: Path,
    merged_products: dict[str, MergedProduct],
) -> None:
    """Sauve l'état courant pour le prochain diff. Rotation last → prev."""
    state_dir.mkdir(parents=True, exist_ok=True)
    state_file = state_dir / "last_import.json"
    prev_file = state_dir / "prev_import.json"

    # Rotation
    if state_file.exists():
        shutil.copy2(state_file, prev_file)

    # Build compact state
    state: dict[str, dict] = {}
    for ref, m in merged_products.items():
        state[ref] = {
            "cost_price": m.cost_price,
            "price_ttc": m.price_ttc,
            "stock_qty": m.stock_quantity,
            "ean": m.ean,
            "family": m.family,
        }

    with open(state_file, "w") as f:
        json.dump(state, f, separators=(",", ":"))

    log.info(f"État courant sauvé: {len(state)} produits → {state_file}")


def compute_diff(
    current: dict[str, MergedProduct],
    previous: dict[str, dict] | None,
) -> DiffResult:
    """Compare l'import courant vs l'état précédent."""
    result = DiffResult()

    if previous is None:
        result.new_products = list(current.keys())
        return result

    current_refs = set(current.keys())
    prev_refs = set(previous.keys())

    # Nouveaux produits
    result.new_products = sorted(current_refs - prev_refs)

    # Produits supprimés
    result.removed_products = sorted(prev_refs - current_refs)

    # Changements sur les produits existants
    common = current_refs & prev_refs
    for ref in common:
        cur = current[ref]
        prev = previous[ref]

        # Price changes
        old_cost = prev.get("cost_price", 0)
        old_ttc = prev.get("price_ttc", 0)
        if cur.cost_price != old_cost or cur.price_ttc != old_ttc:
            pct = 0.0
            if old_ttc and old_ttc > 0:
                pct = round((cur.price_ttc - old_ttc) / old_ttc * 100, 2)
            result.price_changes.append(PriceChange(
                reference=ref,
                ean=cur.ean,
                old_cost=old_cost,
                new_cost=cur.cost_price,
                old_ttc=old_ttc,
                new_ttc=cur.price_ttc,
                pct_change=pct,
            ))

        # Stock changes
        old_qty = prev.get("stock_qty", 0)
        if cur.stock_quantity != old_qty:
            result.stock_changes.append(StockChange(
                reference=ref,
                old_qty=old_qty,
                new_qty=cur.stock_quantity,
            ))

    log.info(
        f"Diff: {len(result.new_products)} nouveaux, "
        f"{len(result.removed_products)} supprimés, "
        f"{len(result.price_changes)} prix changés, "
        f"{len(result.stock_changes)} stocks changés"
    )

    return result
