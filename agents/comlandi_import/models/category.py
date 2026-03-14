from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Category:
    """Catégorie extraite du fichier Categories JSON Comlandi."""

    code: str
    name: str
    level: str = "1"
    parent_code: str | None = None
