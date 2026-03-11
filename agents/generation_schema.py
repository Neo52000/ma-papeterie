#!/usr/bin/env python3
"""
Génération Schema.org JSON-LD — ma-papeterie.fr
Product + Offer + BreadcrumbList + FAQPage → stocké dans product_seo.json_ld

Adapté au schéma existant : utilise product_seo.json_ld (JSONB),
product_images pour les URLs, product_faqs pour les FAQ.
"""
import os
import sys
import json
import logging
from pathlib import Path

Path('logs').mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler('logs/schema.log'), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
if missing:
    log.error(f"Variables d'environnement manquantes : {', '.join(missing)}")
    sys.exit(1)

from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

SITE = 'https://ma-papeterie.fr'


def build_schema(product: dict, images: list, faqs: list, seo: dict | None) -> dict:
    """Construit le Schema.org JSON-LD complet."""
    slug = product.get('slug') or product.get('name', '').lower().replace(' ', '-')[:60]
    url = f"{SITE}/produit/{slug}"

    # Images : priorité aux optimisées, sinon originales
    image_urls = []
    for img in images:
        img_url = img.get('url_optimisee') or img.get('url_originale')
        if img_url:
            image_urls.append(img_url)
    if not image_urls and product.get('image_url'):
        image_urls = [product['image_url']]

    # Description : depuis product_seo ou product
    description = ''
    if seo:
        description = (seo.get('description_courte')
                        or seo.get('meta_description')
                        or '')
    if not description:
        description = product.get('description') or product.get('name', '')

    # Produit principal
    product_schema = {
        "@type": "Product",
        "name": product.get('name', ''),
        "description": description[:500],
        "image": image_urls,
        "url": url,
        "brand": {
            "@type": "Brand",
            "name": product.get('brand', '')
        },
        "sku": product.get('ean') or product.get('sku_interne', ''),
        "mpn": product.get('manufacturer_ref') or product.get('ean', ''),
        "category": product.get('category', ''),
        "offers": {
            "@type": "Offer",
            "url": url,
            "priceCurrency": "EUR",
            "price": str(product.get('price_ttc') or product.get('price', 0)),
            "availability": "https://schema.org/InStock"
                if (product.get('stock_quantity') or 0) > 0
                else "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Organization",
                "name": "Ma Papeterie",
                "url": SITE
            }
        }
    }

    # GTIN
    ean = str(product.get('ean', '') or '')
    if len(ean) == 13:
        product_schema['gtin13'] = ean
    elif len(ean) == 8:
        product_schema['gtin8'] = ean

    # Fil d'ariane
    breadcrumb_items = [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE},
    ]
    if product.get('category'):
        cat_slug = product['category'].lower().replace(' ', '-')
        breadcrumb_items.append({
            "@type": "ListItem", "position": 2,
            "name": product['category'],
            "item": f"{SITE}/categorie/{cat_slug}"
        })
    if product.get('subcategory'):
        subcat_slug = product['subcategory'].lower().replace(' ', '-')
        breadcrumb_items.append({
            "@type": "ListItem", "position": len(breadcrumb_items) + 1,
            "name": product['subcategory'],
            "item": f"{SITE}/categorie/{subcat_slug}"
        })
    breadcrumb_items.append({
        "@type": "ListItem",
        "position": len(breadcrumb_items) + 1,
        "name": product.get('name', ''),
        "item": url
    })

    # Assemblage du @graph
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            product_schema,
            {
                "@type": "BreadcrumbList",
                "itemListElement": breadcrumb_items
            }
        ]
    }

    # FAQPage si des FAQ existent
    if faqs:
        schema['@graph'].append({
            "@type": "FAQPage",
            "mainEntity": [{
                "@type": "Question",
                "name": f['question'],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": f['answer']
                }
            } for f in faqs]
        })

    return schema


def run(batch_size: int = 500, only_missing: bool = True):
    log.info("=== GÉNÉRATION SCHEMA.ORG ===")

    q = supabase.table('products').select(
        'id,name,brand,category,subcategory,description,ean,slug,'
        'price,price_ttc,stock_quantity,image_url,manufacturer_ref,sku_interne'
    )
    if only_missing:
        q = q.eq('schema_generated', False)
    products = q.limit(batch_size).execute().data

    if not products:
        log.info("✅ Tous les produits ont un schéma.")
        return

    log.info(f"{len(products)} produits à traiter")
    ok = err = 0

    for p in products:
        pid = p['id']

        # Récupérer les images
        try:
            images = supabase.table('product_images').select(
                'url_originale,url_optimisee'
            ).eq('product_id', pid).order('display_order').execute().data or []
        except Exception:
            images = []

        # Récupérer les FAQ
        try:
            faqs = supabase.table('product_faqs').select(
                'question,answer'
            ).eq('product_id', pid).order('position').execute().data or []
        except Exception:
            faqs = []

        # Récupérer le SEO existant
        try:
            seo_result = supabase.table('product_seo').select(
                'description_courte,meta_description'
            ).eq('product_id', pid).single().execute()
            seo = seo_result.data
        except Exception:
            seo = None

        try:
            schema = build_schema(p, images, faqs, seo)

            # Stocker dans product_seo.json_ld
            try:
                supabase.table('product_seo').update(
                    {'json_ld': json.dumps(schema)}
                ).eq('product_id', pid).execute()
            except Exception:
                # Si pas de row product_seo, en créer une
                supabase.table('product_seo').insert({
                    'product_id': pid,
                    'json_ld': json.dumps(schema),
                    'status': 'draft',
                    'description_source': 'schema-agent',
                }).execute()

            # Marquer le produit
            supabase.table('products').update(
                {'schema_generated': True}
            ).eq('id', pid).execute()

            ok += 1
        except Exception as e:
            log.error(f"  Erreur {p.get('name', '')[:40]}: {e}")
            err += 1

    log.info(f"\n✅ {ok} schémas générés · {err} erreurs")


if __name__ == '__main__':
    batch = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    run(batch, '--all' not in sys.argv)

# COMMANDES :
# python agents/generation_schema.py 500
# python agents/generation_schema.py 10000 --all
