#!/usr/bin/env python3
"""
Génération SEO métadonnées — ma-papeterie.fr
Génère title, meta description et slug SEO pour chaque produit via Claude.
"""

import os
import json
import time
import re
import unicodedata
from pathlib import Path
from supabase import create_client
import anthropic
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
ANTHROPIC_KEY = os.environ['ANTHROPIC_API_KEY']

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
claude = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

SEO_SYSTEM_PROMPT = """Tu es un expert SEO e-commerce français spécialisé en papeterie et fournitures scolaires.
Tu génères des métadonnées SEO optimisées pour Google France.

Règles :
- meta_title : max 60 caractères, format "[Produit] [Marque] | Ma Papeterie"
- meta_description : max 155 caractères, incluant un call-to-action et le mot-clé principal
- slug : URL-friendly, lowercase, tirets, max 60 caractères, sans accents

Réponds UNIQUEMENT en JSON valide :
{
  "meta_title": "...",
  "meta_description": "...",
  "slug": "..."
}"""


def slugify(text: str) -> str:
    """Fallback slugify si Claude échoue"""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:60].rstrip('-')


def generate_seo_meta(product: dict) -> dict | None:
    """Génère les métadonnées SEO via Claude"""
    name = product.get('name', '')
    brand = product.get('brand', '')
    category = product.get('category', '')
    description = product.get('description', '')

    prompt = f"""Génère les métadonnées SEO pour ce produit :

Nom : {name}
Marque : {brand}
Catégorie : {category}
Description : {description[:200] if description else 'Non disponible'}

Génère meta_title, meta_description et slug selon les règles."""

    try:
        msg = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system=SEO_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )
        content = msg.content[0].text.strip()
        data = json.loads(content)
        return {
            'meta_title': data.get('meta_title', '')[:60],
            'meta_description': data.get('meta_description', '')[:155],
            'slug': data.get('slug', slugify(name))[:60]
        }
    except (json.JSONDecodeError, Exception) as e:
        print(f"Erreur generation SEO pour {name}: {e}")
        # Fallback
        return {
            'meta_title': f"{name} {brand} | Ma Papeterie"[:60],
            'meta_description': f"Achetez {name} {brand} sur ma-papeterie.fr. Livraison rapide en France."[:155],
            'slug': slugify(f"{brand} {name}")
        }


def run_seo_generation(batch_size: int = 200, only_missing: bool = True):
    """Lance la génération SEO sur le catalogue"""
    print("=== GENERATION SEO METADONNEES — MA-PAPETERIE.FR ===")

    query = supabase.table('products').select(
        'id, name, brand, category, description'
    )

    if only_missing:
        query = query.eq('seo_generated', False)

    query = query.limit(batch_size)
    products = query.execute().data

    if not products:
        print("Tous les produits ont deja des metadonnees SEO.")
        return

    print(f"{len(products)} produits a traiter")

    success = 0
    errors = 0

    for i, product in enumerate(products, 1):
        print(f"[{i}/{len(products)}] {product.get('name', '')[:50]}...")

        meta = generate_seo_meta(product)
        if not meta:
            errors += 1
            continue

        try:
            supabase.table('products').update({
                'meta_title': meta['meta_title'],
                'meta_description': meta['meta_description'],
                'slug': meta['slug'],
                'seo_generated': True
            }).eq('id', product['id']).execute()
            success += 1
        except Exception as e:
            print(f"Erreur DB produit {product['id']}: {e}")
            errors += 1

        time.sleep(0.3)  # Rate limiting

    print(f"\n=== RESULTATS ===")
    print(f"SEO generes : {success}")
    print(f"Erreurs : {errors}")


if __name__ == '__main__':
    import sys
    batch = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    only_missing = '--all' not in sys.argv
    run_seo_generation(batch_size=batch, only_missing=only_missing)
