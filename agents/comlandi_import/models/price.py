from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PriceProduct:
    """Données prix extraites du fichier Prices JSON Comlandi."""

    id: str
    cost_price: float = 0.0
    suggested_price: float = 0.0
    tva_rate: float = 20.0
    taxes: dict[str, float] = field(default_factory=dict)
