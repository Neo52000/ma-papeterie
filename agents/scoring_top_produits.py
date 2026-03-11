#!/usr/bin/env python3
"""
Scoring 20/80 — ma-papeterie.fr
50 pts CA top 20% · 30 pts commandes top 20% · 20 pts tags manuels
Seuil is_top_product : score >= 50
Export CSV avec colonne video_needed (OUI pour les 50 premiers)
"""
import os
import sys
import csv
import logging
from datetime import datetime
from pathlib import Path

Path('exports').mkdir(exist_ok=True)
Path('logs').mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler('logs/scoring.log'), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
if missing:
    log.error(f"Variables d'environnement manquantes : {', '.join(missing)}")
    sys.exit(1)

from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

TOP_TAGS = {'bestseller', 'rentrée', 'rentree', 'selection', 'top',
            'vedette', 'populaire', 'promo', 'featured'}


def run():
    log.info("=== SCORING 20/80 ===")

    # Tenter de récupérer les données de performance (orders)
    has_orders = False
    try:
        # Vérifier si la table orders et order_items existent
        supabase.table('orders').select('id').limit(1).execute()
        has_orders = True
        log.info("Table orders trouvée — scoring avec historique commandes")
    except Exception:
        log.warning("Pas de table orders — scoring sur tags et is_featured uniquement")

    # Récupérer tous les produits actifs
    products = supabase.table('products').select(
        'id,ean,name,brand,category,tags,is_featured'
    ).limit(10000).execute().data

    if not products:
        log.warning("Aucun produit trouvé.")
        return

    log.info(f"{len(products)} produits récupérés")

    # Si on a des commandes, essayer de calculer le CA
    revenue_map = {}
    orders_map = {}
    if has_orders:
        try:
            # Chercher une vue product_performance ou calculer manuellement
            perf = supabase.rpc('exec_sql', {
                'query': """
                    SELECT oi.product_id,
                           SUM(oi.quantity * oi.unit_price) as revenue,
                           COUNT(DISTINCT oi.order_id) as order_count
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE o.created_at > NOW() - INTERVAL '12 months'
                    GROUP BY oi.product_id
                """
            }).execute()
            if perf.data:
                for row in perf.data:
                    revenue_map[row['product_id']] = row.get('revenue', 0) or 0
                    orders_map[row['product_id']] = row.get('order_count', 0) or 0
        except Exception as e:
            log.warning(f"Impossible de calculer les performances : {e}")
            has_orders = False

    # Calculer les seuils 80e percentile
    revenues = sorted(revenue_map.values()) if revenue_map else []
    orders_counts = sorted(orders_map.values()) if orders_map else []
    p80_rev = revenues[int(len(revenues) * 0.8)] if revenues else 0
    p80_ord = orders_counts[int(len(orders_counts) * 0.8)] if orders_counts else 0

    results = []
    updates = []

    for p in products:
        score = 0
        reasons = []
        pid = p['id']
        rev = revenue_map.get(pid, 0)
        nb_ord = orders_map.get(pid, 0)
        tags = p.get('tags') or []

        # 50 pts si CA top 20%
        if has_orders and rev >= p80_rev and rev > 0:
            score += 50
            reasons.append(f"CA top 20% ({rev:.0f}€)")

        # 30 pts si commandes top 20%
        if has_orders and nb_ord >= p80_ord and nb_ord > 0:
            score += 30
            reasons.append(f"Cmds top 20% ({nb_ord})")

        # 20 pts si tags pertinents
        matched = set(str(t).lower() for t in tags) & TOP_TAGS
        if matched:
            score += 20
            reasons.append(f"Tag:{','.join(matched)}")

        # 10 pts bonus si is_featured
        if p.get('is_featured'):
            score += 10
            reasons.append("Featured")

        is_top = score >= 50
        reason = ' | '.join(reasons) if reasons else 'Score insuffisant'

        updates.append({
            'id': pid,
            'is_top_product': is_top,
            'top_product_score': float(score),
            'top_product_reason': reason,
            'total_revenue_12m': float(rev),
            'total_orders_12m': int(nb_ord)
        })

        if is_top:
            results.append({
                'id': pid,
                'ean': p.get('ean', ''),
                'name': p.get('name', ''),
                'brand': p.get('brand', ''),
                'category': p.get('category', ''),
                'score': score,
                'revenue_12m': rev,
                'orders_12m': nb_ord,
                'reason': reason
            })

    # Mise à jour en base
    log.info(f"Mise à jour de {len(updates)} produits...")
    for item in updates:
        pid = item.pop('id')
        try:
            supabase.table('products').update(item).eq('id', pid).execute()
        except Exception as e:
            log.error(f"Erreur MAJ {pid}: {e}")

    # Tri par score décroissant
    results.sort(key=lambda x: (x['score'], x['revenue_12m']), reverse=True)

    # Export CSV
    date_str = datetime.now().strftime('%Y%m%d')
    csv_path = f'exports/top_produits_{date_str}.csv'
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'rank', 'ean', 'name', 'brand', 'category',
            'score', 'revenue_12m', 'orders_12m', 'reason', 'video_needed'
        ])
        writer.writeheader()
        for rank, p in enumerate(results[:100], 1):
            writer.writerow({
                **p, 'rank': rank,
                'revenue_12m': round(p['revenue_12m'], 2),
                'video_needed': 'OUI' if rank <= 50 else 'NON'
            })

    log.info(f"✅ {len(results)} produits top 20/80 | Export : {csv_path}")

    if results:
        log.info("\nTop 10 :")
        for p in results[:10]:
            log.info(f"  [{p['score']}pts] {p['brand']} {p['name'][:45]}")


if __name__ == '__main__':
    run()

# COMMANDE : python agents/scoring_top_produits.py
