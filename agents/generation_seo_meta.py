#!/usr/bin/env python3
"""
Génération métadonnées SEO — ma-papeterie.fr
Title (< 65 chars) · Meta description (< 155 chars) · Slug URL

Adapté au schéma existant : utilise la table product_seo
(meta_title, meta_description, description_source, status, generated_at)
et products.slug.
"""
import os
import sys
import re
import json
import time
import logging
from pathlib import Path

Path('logs').mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler('logs/seo_meta.log'), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY']
missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
if missing:
    log.error(f"Variables d'environnement manquantes : {', '.join(missing)}")
    sys.exit(1)

import anthropic
from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
claude = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])


def slugify(text: str) -> str:
    """Génère un slug URL propre sans accents."""
    replacements = [
        ('à', 'a'), ('â', 'a'), ('ä', 'a'),
        ('é', 'e'), ('è', 'e'), ('ê', 'e'), ('ë', 'e'),
        ('î', 'i'), ('ï', 'i'),
        ('ô', 'o'), ('ö', 'o'),
        ('ù', 'u'), ('û', 'u'), ('ü', 'u'),
        ('ç', 'c'), ('ñ', 'n'),
    ]
    text = text.lower()
    for fr, en in replacements:
        text = text.replace(fr, en)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')


def build_prompt(p: dict) -> str:
    return (
        f"Génère les métadonnées SEO pour cette fiche produit ma-papeterie.fr.\n"
        f"Nom:{p.get('name', '')} Marque:{p.get('brand', '')}\n"
        f"Catégorie:{p.get('category', '')} EAN:{p.get('ean', '')}\n"
        f"Description:{str(p.get('description', ''))[:200]}\n\n"
        f"Réponds UNIQUEMENT en JSON :\n"
        f'{{"seo_title":"...","seo_description":"..."}}\n\n'
        f"seo_title < 65 chars : [Marque] [Nom produit] | Ma-Papeterie.fr\n"
        f"seo_description < 155 chars : commence par Achetez · 1 bénéfice · "
        f"livraison rapide · Ref.[EAN] si connu"
    )


def send_batch(products: list) -> dict:
    """Envoie un lot au Batch API Claude."""
    reqs = [{
        "custom_id": p['id'],
        "params": {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 300,
            "messages": [{"role": "user", "content": build_prompt(p)}]
        }
    } for p in products]

    batch = claude.beta.messages.batches.create(requests=reqs)
    log.info(f"  Batch envoyé : {batch.id}")

    while True:
        time.sleep(30)
        s = claude.beta.messages.batches.retrieve(batch.id)
        c = s.request_counts
        log.info(f"  → {c.succeeded} OK / {c.errored} err / {c.processing} en cours")
        if s.processing_status == 'ended':
            break

    results = {}
    for r in claude.beta.messages.batches.results(batch.id):
        if r.result.type == 'succeeded':
            try:
                text = r.result.message.content[0].text
                # Extraire le JSON même s'il y a du texte autour
                match = re.search(r'\{[^}]+\}', text)
                if match:
                    results[r.custom_id] = json.loads(match.group())
            except Exception:
                pass

    return results


def run(batch_size: int = 500, only_missing: bool = True):
    log.info("=== GÉNÉRATION SEO MÉTADONNÉES ===")

    # Trouver les produits sans entrée product_seo ou sans meta_title
    if only_missing:
        # Récupérer les produits qui n'ont pas de product_seo
        products = supabase.table('products').select(
            'id,name,brand,category,ean,description,slug'
        ).limit(batch_size).execute().data

        if products:
            # Vérifier lesquels ont déjà un product_seo
            pids = [p['id'] for p in products]
            existing_seo = supabase.table('product_seo').select(
                'product_id'
            ).in_('product_id', pids).execute().data
            existing_pids = {s['product_id'] for s in existing_seo}
            products = [p for p in products if p['id'] not in existing_pids]
    else:
        products = supabase.table('products').select(
            'id,name,brand,category,ean,description,slug'
        ).limit(batch_size).execute().data

    if not products:
        log.info("✅ Tous les produits ont des métadonnées SEO.")
        return

    log.info(f"{len(products)} produits à traiter")

    ok = err = 0
    for i in range(0, len(products), 100):
        chunk = products[i:i + 100]
        log.info(f"\nChunk {i // 100 + 1} ({len(chunk)} produits)")
        results = send_batch(chunk)

        for p in chunk:
            data = results.get(p['id'])
            if not data:
                err += 1
                continue

            meta_title = data.get('seo_title', '')[:65]
            meta_desc = data.get('seo_description', '')[:155]

            # Générer le slug si absent
            ean_short = str(p.get('ean', ''))[-6:] if p.get('ean') else ''
            brand_slug = slugify(p.get('brand', ''))
            name_slug = slugify(p.get('name', ''))[:50]
            slug = f"{brand_slug}-{name_slug}-{ean_short}".strip('-')

            # UPSERT dans product_seo
            try:
                supabase.table('product_seo').upsert({
                    'product_id': p['id'],
                    'meta_title': meta_title,
                    'meta_description': meta_desc,
                    'description_source': 'claude-agent',
                    'status': 'draft',
                    'generated_at': 'now()',
                }, on_conflict='product_id').execute()
            except Exception as e:
                # Si upsert échoue, tenter insert puis update
                try:
                    supabase.table('product_seo').insert({
                        'product_id': p['id'],
                        'meta_title': meta_title,
                        'meta_description': meta_desc,
                        'description_source': 'claude-agent',
                        'status': 'draft',
                    }).execute()
                except Exception:
                    try:
                        supabase.table('product_seo').update({
                            'meta_title': meta_title,
                            'meta_description': meta_desc,
                            'description_source': 'claude-agent',
                            'status': 'draft',
                        }).eq('product_id', p['id']).execute()
                    except Exception as e2:
                        log.error(f"  Erreur product_seo {p['id']}: {e2}")
                        err += 1
                        continue

            # Mettre à jour le slug si absent
            if not p.get('slug'):
                try:
                    supabase.table('products').update(
                        {'slug': slug}
                    ).eq('id', p['id']).execute()
                except Exception:
                    pass

            ok += 1

    log.info(f"\n✅ {ok} métadonnées générées · {err} erreurs")


if __name__ == '__main__':
    batch = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    run(batch, '--all' not in sys.argv)

# COMMANDES :
# python agents/generation_seo_meta.py 500
# python agents/generation_seo_meta.py 10000 --all
