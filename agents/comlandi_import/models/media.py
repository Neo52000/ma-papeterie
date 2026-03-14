from __future__ import annotations

from dataclasses import dataclass


@dataclass
class MultimediaLink:
    """Lien multimédia extrait du fichier MultimediaLinks JSON Comlandi."""

    product_id: str
    url: str
    mml_type: str = "IMG"
    order: int = 0
    name: str | None = None
    active: bool = True
