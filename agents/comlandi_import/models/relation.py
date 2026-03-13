from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProductRelation:
    """Relation produit extraite du fichier RelationedProducts JSON Comlandi."""

    product_id: str
    related_product_id: str
    relation_type: str = "alternative"
