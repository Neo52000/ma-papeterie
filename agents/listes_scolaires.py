#!/usr/bin/env python3
"""
Génération des listes scolaires types — ma-papeterie.fr
14 listes par niveau (PS → Terminale) stockées en base Supabase.
"""

import os
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv
from listes_data import SCHOOL_LISTS

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# UUID déterministe pour l'école "générique" (ma-papeterie)
GENERIC_SCHOOL_ID = "00000000-0000-0000-0000-000000000001"
SCHOOL_YEAR = "2025-2026"


def ensure_generic_school():
    """Crée l'école générique si elle n'existe pas"""
    try:
        existing = supabase.table('schools').select('id').eq('id', GENERIC_SCHOOL_ID).execute()
        if not existing.data:
            supabase.table('schools').insert({
                'id': GENERIC_SCHOOL_ID,
                'name': 'Ma Papeterie - Listes Types',
                'city': 'France',
                'department': '00',
                'zip_code': '00000',
            }).execute()
            print("Ecole generique creee")
    except Exception as e:
        print(f"Note: ecole generique: {e}")


def match_product_by_name(item_name: str, category: str) -> dict | None:
    """Tente de trouver un produit correspondant dans le catalogue"""
    try:
        # Recherche par nom partiel
        results = supabase.table('products').select(
            'id, name, ean, price'
        ).ilike('name', f'%{item_name.split("(")[0].strip()[:30]}%').limit(1).execute()

        if results.data:
            return results.data[0]

        # Fallback : recherche par catégorie
        results = supabase.table('products').select(
            'id, name, ean, price'
        ).ilike('category', f'%{category}%').limit(1).execute()

        if results.data:
            return results.data[0]
    except Exception:
        pass

    return None


def generate_school_lists():
    """Génère les 14 listes scolaires types en base"""
    print("=== GENERATION LISTES SCOLAIRES — MA-PAPETERIE.FR ===")

    ensure_generic_school()

    total_lists = 0
    total_items = 0

    for level_key, level_data in SCHOOL_LISTS.items():
        level_name = level_data['level']
        cycle = level_data['cycle']
        items = level_data['items']

        print(f"\n[{level_key}] {level_name} ({cycle}) — {len(items)} articles")

        # Créer ou mettre à jour la liste
        list_name = f"Liste type {level_name} {SCHOOL_YEAR}"

        try:
            # Vérifie si la liste existe déjà
            existing = supabase.table('school_lists').select('id').eq(
                'school_id', GENERIC_SCHOOL_ID
            ).eq('class_level', level_key).eq('school_year', SCHOOL_YEAR).execute()

            if existing.data:
                list_id = existing.data[0]['id']
                # Supprime les anciens items
                supabase.table('school_list_items').delete().eq('list_id', list_id).execute()
                print(f"  Liste existante mise a jour: {list_id}")
            else:
                result = supabase.table('school_lists').insert({
                    'school_id': GENERIC_SCHOOL_ID,
                    'class_level': level_key,
                    'school_year': SCHOOL_YEAR,
                    'list_name': list_name,
                    'status': 'active'
                }).execute()
                list_id = result.data[0]['id']
                print(f"  Nouvelle liste creee: {list_id}")

            total_lists += 1

            # Ajouter les items
            for idx, item in enumerate(items, 1):
                product = match_product_by_name(item['name'], item['category'])

                item_row = {
                    'list_id': list_id,
                    'item_label': item['name'],
                    'quantity': item['qty'],
                    'category': item['category'],
                    'position': idx,
                }

                if product:
                    item_row['product_id'] = product['id']
                    print(f"    [{idx}] {item['name']} x{item['qty']} -> {product['name'][:40]}")
                else:
                    print(f"    [{idx}] {item['name']} x{item['qty']} -> (pas de correspondance)")

                supabase.table('school_list_items').insert(item_row).execute()
                total_items += 1

        except Exception as e:
            print(f"  ERREUR {level_key}: {e}")

    print(f"\n=== RESULTATS ===")
    print(f"Listes creees : {total_lists}")
    print(f"Articles inseres : {total_items}")


if __name__ == '__main__':
    generate_school_lists()
