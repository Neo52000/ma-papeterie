#!/usr/bin/env python3
"""
Identification produits 20/80 — ma-papeterie.fr
Calcule le score de chaque produit et flag is_top_product
"""

import os
import csv
from datetime import datetime
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def calculate_top_products():
    """
    Algorithme de scoring multi-critères :
    - 50 pts : CA dans le top 20% du catalogue
    - 30 pts : Commandes dans le top 20%
    - 20 pts : Présence du tag 'bestseller' ou 'rentrée' ou 'selection'
    Seuil de sélection : score >= 50 → is_top_product = True
    """

    print("Recuperation des donnees de performance...")

    # Tente d'utiliser la vue matérialisée
    try:
        products = supabase.from_('product_performance').select('*').execute().data
        print(f"Vue materialisee chargee : {len(products)} produits")
    except Exception:
        # Fallback : récupère juste les produits sans données de commandes
        print("Vue materialisee indisponible, scoring sur tags uniquement")
        products = supabase.table('products').select(
            'id, ean, name, brand, category, tags'
        ).execute().data

    if not products:
        print("Aucun produit trouve")
        return

    print(f"{len(products)} produits analyses")

    # Calcul des percentiles CA et commandes
    revenues = sorted([p.get('revenue_12m', 0) or 0 for p in products])
    orders = sorted([p.get('orders_12m', 0) or 0 for p in products])

    p80_revenue = revenues[int(len(revenues) * 0.8)] if revenues else 0
    p80_orders = orders[int(len(orders) * 0.8)] if orders else 0

    print(f"Seuil 80% CA : {p80_revenue:.2f}EUR | Seuil 80% commandes : {p80_orders}")

    top_products = []
    updates = []

    for p in products:
        score = 0
        reasons = []

        revenue = p.get('revenue_12m', 0) or 0
        nb_orders = p.get('orders_12m', 0) or 0
        tags = p.get('tags', []) or []

        # Critère 1 : CA
        if revenue >= p80_revenue and revenue > 0:
            score += 50
            reasons.append(f"CA top 20% ({revenue:.0f}EUR)")

        # Critère 2 : Volume commandes
        if nb_orders >= p80_orders and nb_orders > 0:
            score += 30
            reasons.append(f"Commandes top 20% ({nb_orders})")

        # Critère 3 : Tags manuels
        top_tags = {'bestseller', 'rentree', 'selection', 'top', 'vedette', 'populaire'}
        matching_tags = set(str(t).lower() for t in tags) & top_tags
        if matching_tags:
            score += 20
            reasons.append(f"Tag: {', '.join(matching_tags)}")

        is_top = score >= 50
        reason_text = ' | '.join(reasons) if reasons else 'Score insuffisant'

        updates.append({
            'id': p['id'],
            'is_top_product': is_top,
            'top_product_score': score,
            'top_product_reason': reason_text,
            'total_revenue_12m': revenue,
            'total_orders_12m': nb_orders
        })

        if is_top:
            top_products.append({
                'id': p['id'],
                'ean': p.get('ean', ''),
                'name': p.get('name', ''),
                'brand': p.get('brand', ''),
                'category': p.get('category', ''),
                'score': score,
                'revenue_12m': revenue,
                'orders_12m': nb_orders,
                'reasons': reason_text
            })

    # Mise à jour en base
    print(f"Mise a jour de {len(updates)} produits en base...")

    for item in updates:
        pid = item.pop('id')
        supabase.table('products').update(item).eq('id', pid).execute()

    # Tri par score décroissant
    top_products.sort(key=lambda x: (x['score'], x['revenue_12m']), reverse=True)

    # Export CSV
    Path('exports').mkdir(exist_ok=True)
    date_str = datetime.now().strftime('%Y%m%d')
    csv_path = f'exports/top_products_{date_str}.csv'

    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'rank', 'ean', 'name', 'brand', 'category',
            'score', 'revenue_12m', 'orders_12m', 'reasons', 'video_needed'
        ])
        writer.writeheader()
        for rank, p in enumerate(top_products[:100], 1):
            writer.writerow({
                'rank': rank,
                'ean': p['ean'],
                'name': p['name'],
                'brand': p['brand'],
                'category': p['category'],
                'score': p['score'],
                'revenue_12m': round(p['revenue_12m'], 2),
                'orders_12m': p['orders_12m'],
                'reasons': p['reasons'],
                'video_needed': 'OUI' if rank <= 50 else 'NON'
            })

    print(f"\n=== RESULTATS ===")
    print(f"Produits is_top_product = TRUE : {len(top_products)}")
    print(f"Produits prioritaires video (top 50) : {min(50, len(top_products))}")
    print(f"Export CSV : {csv_path}")
    print(f"\nTop 10 produits :")
    for p in top_products[:10]:
        print(f"  [{p['score']}pts] {p['brand']} {p['name'][:50]} -- {p['reasons']}")


if __name__ == '__main__':
    calculate_top_products()
