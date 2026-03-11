#!/usr/bin/env python3
"""
Génération Schema.org JSON-LD — ma-papeterie.fr
Génère le balisage structuré Product + FAQPage pour chaque fiche produit.
"""

import os
import json
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SITE_URL = "https://ma-papeterie.fr"


def build_product_schema(product: dict, faqs: list) -> dict:
    """Construit le JSON-LD Schema.org pour un produit"""
    schema = {
        "@context": "https://schema.org",
        "@graph": []
    }

    # Schema Product
    product_schema = {
        "@type": "Product",
        "name": product.get('name', ''),
        "description": product.get('description') or product.get('meta_description') or '',
        "brand": {
            "@type": "Brand",
            "name": product.get('brand', '')
        },
        "category": product.get('category', ''),
        "url": f"{SITE_URL}/produit/{product.get('slug', product['id'])}",
    }

    # Images
    images = []
    for i in range(1, 4):
        img = product.get(f'processed_image_{i}')
        if img:
            images.append(img)
    if not images and product.get('image_url'):
        images.append(product['image_url'])
    if images:
        product_schema["image"] = images

    # EAN / SKU
    if product.get('ean'):
        product_schema["gtin13"] = product['ean']
    if product.get('sku_interne'):
        product_schema["sku"] = product['sku_interne']

    # Price (Offer)
    if product.get('price'):
        product_schema["offers"] = {
            "@type": "Offer",
            "url": product_schema["url"],
            "priceCurrency": "EUR",
            "price": str(product['price']),
            "availability": "https://schema.org/InStock" if product.get('stock_quantity', 0) > 0 else "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Organization",
                "name": "Ma Papeterie"
            }
        }

    schema["@graph"].append(product_schema)

    # Schema FAQPage
    if faqs:
        faq_schema = {
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": faq['question'],
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq['answer']
                    }
                }
                for faq in faqs
            ]
        }
        schema["@graph"].append(faq_schema)

    return schema


def run_schema_generation(batch_size: int = 200, only_missing: bool = True):
    """Génère le Schema.org JSON-LD pour tous les produits"""
    print("=== GENERATION SCHEMA.ORG — MA-PAPETERIE.FR ===")

    # Récupère les produits
    query = supabase.table('products').select(
        'id, name, description, brand, category, slug, ean, sku_interne, '
        'price, stock_quantity, image_url, '
        'processed_image_1, processed_image_2, processed_image_3, '
        'meta_description'
    )

    if only_missing:
        query = query.is_('schema_json', 'null')

    query = query.limit(batch_size)
    products = query.execute().data

    if not products:
        print("Tous les produits ont deja un schema JSON-LD.")
        return

    print(f"{len(products)} produits a traiter")

    # Récupère toutes les FAQs en une seule requête
    product_ids = [p['id'] for p in products]
    all_faqs = {}

    # Fetch FAQs in batches (Supabase IN filter limit)
    for i in range(0, len(product_ids), 50):
        batch_ids = product_ids[i:i+50]
        faqs_response = supabase.table('product_faqs').select(
            'product_id, question, answer, position'
        ).in_('product_id', batch_ids).order('position').execute()

        for faq in faqs_response.data:
            pid = faq['product_id']
            if pid not in all_faqs:
                all_faqs[pid] = []
            all_faqs[pid].append(faq)

    success = 0
    errors = 0

    for product in products:
        try:
            faqs = all_faqs.get(product['id'], [])
            schema = build_product_schema(product, faqs)

            supabase.table('products').update({
                'schema_json': schema
            }).eq('id', product['id']).execute()

            success += 1
        except Exception as e:
            print(f"Erreur produit {product['id']}: {e}")
            errors += 1

    print(f"\n=== RESULTATS ===")
    print(f"Schemas generes : {success}")
    print(f"Erreurs : {errors}")


if __name__ == '__main__':
    import sys
    batch = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    only_missing = '--all' not in sys.argv
    run_schema_generation(batch_size=batch, only_missing=only_missing)
