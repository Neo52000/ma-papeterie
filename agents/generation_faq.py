#!/usr/bin/env python3
"""
Génération FAQ produit SEO — ma-papeterie.fr
5 questions/réponses par fiche via Claude Batch API
"""

import os
import json
import time
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

FAQ_SYSTEM_PROMPT = """Tu es un expert SEO e-commerce spécialisé papeterie et fournitures scolaires françaises.
Tu génères des FAQ produit optimisées pour Google (Schema.org FAQPage).

Règles impératives :
- Exactement 5 questions, ni plus ni moins
- Questions courtes (< 15 mots), réponses entre 40 et 120 mots
- Couvre ces 5 angles : compatibilité/niveau scolaire, usage pratique, comparaison alternatives,
  entretien/durée de vie, achat en lot/économies
- Intègre naturellement les mots-clés de la catégorie produit
- Pas de question sur le prix ou la livraison (géré ailleurs)
- Réponses factuelles, concrètes, utiles
- Réponds UNIQUEMENT en JSON valide, format exact :
{
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}"""


def build_faq_prompt(product: dict) -> str:
    name = product.get('name', '')
    brand = product.get('brand', '')
    category = product.get('category', '')
    description = product.get('description', '')
    school_level = product.get('school_level', '')

    return f"""Génère une FAQ SEO pour ce produit de ma-papeterie.fr :

Nom : {name}
Marque : {brand}
Catégorie : {category}
Niveau scolaire : {school_level or 'tous niveaux'}
Description disponible : {description[:300] if description else 'Non disponible'}

Génère 5 questions/réponses pertinentes selon les règles du système."""


def generate_faqs_batch(products: list) -> dict:
    """
    Utilise le Batch API Anthropic pour traiter plusieurs produits en parallèle.
    """

    print(f"Envoi batch de {len(products)} produits a Claude...")

    requests_batch = []
    for product in products:
        requests_batch.append({
            "custom_id": product['id'],
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 800,
                "system": FAQ_SYSTEM_PROMPT,
                "messages": [
                    {"role": "user", "content": build_faq_prompt(product)}
                ]
            }
        })

    # Soumettre le batch
    batch = claude.beta.messages.batches.create(requests=requests_batch)
    batch_id = batch.id
    print(f"Batch soumis : {batch_id}")
    print("Traitement en cours (5-15 minutes pour 100 produits)...")

    # Polling jusqu'à completion
    while True:
        time.sleep(30)
        status = claude.beta.messages.batches.retrieve(batch_id)

        counts = status.request_counts
        print(f"  -> {counts.succeeded} reussis / {counts.errored} erreurs / {counts.processing} en cours")

        if status.processing_status == 'ended':
            break

    print(f"Batch termine : {status.request_counts.succeeded} succes")

    # Récupérer les résultats
    results = {}
    for result in claude.beta.messages.batches.results(batch_id):
        if result.result.type == 'succeeded':
            content = result.result.message.content[0].text
            try:
                data = json.loads(content)
                results[result.custom_id] = data.get('faqs', [])
            except json.JSONDecodeError:
                print(f"JSON invalide pour produit {result.custom_id}")

    return results


def save_faqs_to_db(results: dict) -> tuple:
    """Sauvegarde les FAQs en base et met à jour le flag"""
    success = 0
    errors = 0

    for product_id, faqs in results.items():
        if not faqs or len(faqs) != 5:
            errors += 1
            continue

        try:
            # Supprime les anciennes FAQs si régénération
            supabase.table('product_faqs').delete().eq('product_id', product_id).execute()

            # Insère les nouvelles
            rows = [
                {
                    'product_id': product_id,
                    'question': faq['question'],
                    'answer': faq['answer'],
                    'position': i + 1
                }
                for i, faq in enumerate(faqs)
            ]
            supabase.table('product_faqs').insert(rows).execute()

            # Flag mis à jour
            supabase.table('products').update(
                {'faq_generated': True}
            ).eq('id', product_id).execute()

            success += 1
        except Exception as e:
            print(f"Erreur DB produit {product_id}: {e}")
            errors += 1

    return success, errors


def run_faq_generation(batch_size: int = 100, only_missing: bool = True):
    """Lance la génération de FAQs sur le catalogue"""
    print("=== GENERATION FAQ PRODUITS — MA-PAPETERIE.FR ===")

    query = supabase.table('products').select(
        'id, name, brand, category, description, school_level'
    )

    if only_missing:
        query = query.eq('faq_generated', False)

    query = query.limit(batch_size)
    products = query.execute().data

    if not products:
        print("Tous les produits ont deja une FAQ generee.")
        return

    print(f"{len(products)} produits a traiter")

    # Traitement par chunks de 100 (limite Batch API)
    chunk_size = 100
    total_success = 0
    total_errors = 0

    for i in range(0, len(products), chunk_size):
        chunk = products[i:i+chunk_size]
        print(f"\nChunk {i//chunk_size + 1}/{(len(products)-1)//chunk_size + 1} ({len(chunk)} produits)")

        results = generate_faqs_batch(chunk)
        success, errors = save_faqs_to_db(results)

        total_success += success
        total_errors += errors
        print(f"Chunk termine : {success} succes / {errors} erreurs")

    print(f"\n=== BILAN FINAL ===")
    print(f"FAQs generees : {total_success}")
    print(f"Erreurs : {total_errors}")
    print(f"Cout estime : ~{total_success * 0.0003:.2f}EUR (Batch API Haiku)")


if __name__ == '__main__':
    import sys
    batch = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    only_missing = '--all' not in sys.argv
    run_faq_generation(batch_size=batch, only_missing=only_missing)
