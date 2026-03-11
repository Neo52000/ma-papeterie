#!/usr/bin/env python3
"""
Listes scolaires — ma-papeterie.fr
Crée/met à jour les templates de listes scolaires pour 14 niveaux
et associe les produits du catalogue via recherche ILIKE.

Adapté au schéma existant : utilise school_list_templates (pas school_lists
qui nécessite un school_id).
"""
import os
import sys
import logging
from pathlib import Path

# Ajouter le dossier agents au path pour l'import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

Path('logs').mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler('logs/listes.log'), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
if missing:
    log.error(f"Variables d'environnement manquantes : {', '.join(missing)}")
    sys.exit(1)

from supabase import create_client
from listes_data import LISTES

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

YEAR = '2026-2027'


def find_product(keyword: str) -> str | None:
    """Cherche un produit par mot-clé dans le catalogue."""
    try:
        # Recherche directe
        r = supabase.table('products').select('id,name').ilike(
            'name', f'%{keyword}%'
        ).eq('is_active', True).limit(1).execute()
        if r.data:
            return r.data[0]['id']

        # Recherche par premier mot significatif (> 3 chars)
        words = [w for w in keyword.split() if len(w) > 3]
        for word in words[:2]:
            r = supabase.table('products').select('id,name').ilike(
                'name', f'%{word}%'
            ).eq('is_active', True).limit(1).execute()
            if r.data:
                return r.data[0]['id']

        return None
    except Exception:
        return None


def create_template(level_key: str, data: dict):
    """Crée ou met à jour un template de liste scolaire."""
    log.info(f"  {data['label']}...")

    template_name = f"Liste {data['label']} {YEAR}"

    # Vérifier si le template existe déjà
    existing = supabase.table('school_list_templates').select('id').eq(
        'class_level', data['slug']
    ).execute()

    if existing.data:
        template_id = existing.data[0]['id']
        supabase.table('school_list_templates').update({
            'name': template_name,
            'is_public': True,
            'description': f"Liste de fournitures scolaires {data['label']} "
                           f"pour l'année {YEAR}",
        }).eq('id', template_id).execute()
    else:
        r = supabase.table('school_list_templates').insert({
            'class_level': data['slug'],
            'school_type': data.get('school_type', 'élémentaire'),
            'name': template_name,
            'is_public': True,
            'description': f"Liste de fournitures scolaires {data['label']} "
                           f"pour l'année {YEAR}",
        }).execute()
        template_id = r.data[0]['id']

    # Vérifier si school_list_template_items existe
    # (cette table peut ne pas exister dans le schéma actuel)
    try:
        supabase.table('school_list_template_items').select('id').limit(0).execute()
        has_template_items = True
    except Exception:
        has_template_items = False

    # Associer les produits
    matched = 0
    items_data = []

    for pos, item_name in enumerate(data['essentiels'], 1):
        pid = find_product(item_name)
        if pid:
            matched += 1

        item = {
            'item_name': item_name,
            'quantity': 1,
            'is_mandatory': True,
            'position': pos,
        }
        if pid:
            item['suggested_product_ids'] = [pid]

        items_data.append(item)

    if has_template_items:
        # Supprimer les anciens items
        try:
            supabase.table('school_list_template_items').delete().eq(
                'template_id', template_id
            ).execute()
        except Exception:
            pass

        # Insérer les nouveaux
        for item in items_data:
            item['template_id'] = template_id
            try:
                supabase.table('school_list_template_items').insert(item).execute()
            except Exception as e:
                log.warning(f"    Erreur insertion item: {e}")
    else:
        log.info(f"    (Table school_list_template_items absente — "
                 f"données stockées dans le template uniquement)")

    log.info(f"    ✅ {matched}/{len(data['essentiels'])} produits associés")
    return matched


def run():
    log.info(f"=== LISTES SCOLAIRES {YEAR} ===")

    total_matched = 0
    total_items = 0

    for key, data in LISTES.items():
        matched = create_template(key, data)
        total_matched += matched
        total_items += len(data['essentiels'])

    log.info(f"\n✅ {len(LISTES)} listes créées pour {YEAR}")
    log.info(f"   {total_matched}/{total_items} produits associés au catalogue")


if __name__ == '__main__':
    run()

# COMMANDE : python agents/listes_scolaires.py
