"""Configuration et constantes pour le pipeline Comlandi/Liderpapel."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Config:
    """Configuration du pipeline d'import."""

    supabase_url: str = ""
    supabase_key: str = ""
    data_dir: Path = field(default_factory=lambda: Path("data/liderpapel"))
    state_dir: Path = field(default_factory=lambda: Path("data/liderpapel/.state"))
    logs_dir: Path = field(default_factory=lambda: Path("logs"))
    batch_size: int = 200
    ghost_offer_days: int = 7
    default_coefficient: float = 2.0
    default_tva_rate: float = 20.0
    supplier_name: str = "COMLANDI"
    dry_run: bool = False

    @classmethod
    def from_env(cls) -> Config:
        """Charge la configuration depuis les variables d'environnement."""
        return cls(
            supabase_url=os.environ.get("SUPABASE_URL", ""),
            supabase_key=os.environ.get("SUPABASE_SERVICE_KEY", ""),
            data_dir=Path(os.environ.get("COMLANDI_DATA_DIR", "data/liderpapel")),
            state_dir=Path(os.environ.get("COMLANDI_STATE_DIR", "data/liderpapel/.state")),
            logs_dir=Path(os.environ.get("COMLANDI_LOGS_DIR", "logs")),
            batch_size=int(os.environ.get("COMLANDI_BATCH_SIZE", "200")),
            ghost_offer_days=int(os.environ.get("COMLANDI_GHOST_DAYS", "7")),
            dry_run=os.environ.get("COMLANDI_DRY_RUN", "").lower() in ("1", "true", "yes"),
        )

    def validate(self) -> list[str]:
        """Retourne la liste des erreurs de configuration."""
        errors = []
        if not self.supabase_url:
            errors.append("SUPABASE_URL manquant")
        if not self.supabase_key:
            errors.append("SUPABASE_SERVICE_KEY manquant")
        return errors


# Noms de fichiers Comlandi (clientId 3321289)
FILE_PATTERNS: dict[str, str] = {
    "catalog": "Catalog_fr_FR_3321289.json",
    "descriptions": "Descriptions_fr_FR_3321289.json",
    "prices": "Prices_fr_FR_3321289.json",
    "stocks": "Stocks_fr_FR_3321289.json",
    "categories": "Categories_fr_FR_3321289.json",
    "multimedia": "MultimediaLinks_fr_FR_3321289.json",
    "relations": "RelationedProducts_fr_FR_3321289.json",
    "delivery_orders": "DeliveryOrders_fr_FR_*_3321289.json",
    "my_account": "MyAccount_fr_FR_3321289.json",
}

# Codes de référence EAN (priorité décroissante)
EAN_REF_CODES = ["EAN_UMV", "EAN_UNITARIO", "EAN_UNIDAD"]

# Mapping DescCode → champ SEO
DESC_CODE_MAP: dict[str, str] = {
    "INT_VTE": "meta_title",
    "MINI_DESC": "description_courte",
    "TXT_RCOM": "description_longue",
    "ABRV_DEC": "meta_description",
    "AMPL_DESC": "description_longue",       # fallback
    "DETAILED": "description_detaillee",
    "COMP": "description_detaillee",
    "TECH_SHEET": "description_detaillee",
    "DETALLADA": "description_detaillee",
}

# Aliases pour les champs AdditionalInfo (Comlandi varie la casse)
ADDITIONAL_INFO_ALIASES: dict[str, list[str]] = {
    "brand": ["Brand", "brand", "Marca"],
    "color": ["Color", "Colour", "Couleur", "colour", "color"],
    "format": ["Format", "format", "Size", "size"],
    "material": ["Material", "material", "Matière", "Matiere"],
    "usage": ["Usage", "usage"],
    "description": ["Description", "description"],
}
