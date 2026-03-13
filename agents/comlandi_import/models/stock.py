from __future__ import annotations

from dataclasses import dataclass


@dataclass
class StockProduct:
    """Données stock extraites du fichier Stocks JSON Comlandi."""

    id: str
    available_quantity: int = 0
