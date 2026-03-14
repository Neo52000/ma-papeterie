#!/usr/bin/env python3
"""
Génération FAQ SEO — ma-papeterie.fr
5 Q/R par fiche · Claude Batch API Haiku · ~0,0003€/produit
Stocke dans la table product_faqs.
"""
import os
import sys
import json
import time
import logging
from pathlib import Path

Path('logs').mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler('logs/faq.log'), logging.StreamHandler()]
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

SYSTEM = """Expert SEO e-commerce papeterie et fournitures scolaires françaises.
Tu génères des FAQ produit optimisées pour Google (Schema.org FAQPage).
Règles impératives :
- Exactement 5 questions, ni plus ni moins
- Questions < 15 mots · réponses 40–120 mots
- 5 angles : niveau scolaire/compatibilité · usage pratique · comparaison · durée de vie · achat en lot/économies
- Mots-clés de la catégorie intégrés naturellement · pas de question sur prix/livraison
- Réponds UNIQUEMENT en JSON valide :
{"faqs": [{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."}]}"""


def build_prompt(p: dict) -> str:
    return (
        f"FAQ SEO pour ce produit ma-papeterie.fr :\n"
        f"Nom:{p.get('name', '')} Marque:{p.get('brand', '')}\n"
        f"Catégorie:{p.get('category', '')} "
        f"Niveau:{p.get('school_level', 'tous niveaux')}\n"
        f"Description:{str(p.get('description', ''))[:300] or 'NC'}\n"
        f"Génère les 5 Q/R selon les règles."
    )


def send_batch(products: list) -> dict:
    """Envoie un lot de produits au Batch API et retourne les résultats."""
    reqs = [{
        "custom_id": p['id'],
        "params": {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 800,
            "system": SYSTEM,
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
                data = json.loads(r.result.message.content[0].text)
                faqs = data.get('faqs', [])
                if len(faqs) == 5:
                    results[r.custom_id] = faqs
            except Exception:
                pass

    return results


def save_faqs(results: dict) -> tuple[int, int]:
    """Sauvegarde les FAQs dans product_faqs et met à jour le flag."""
    ok = err = 0
    for pid, faqs in results.items():
        try:
            # Supprimer les anciennes FAQ
            supabase.table('product_faqs').delete().eq('product_id', pid).execute()
            # Insérer les nouvelles
            supabase.table('product_faqs').insert([{
                'product_id': pid,
                'question': f['question'],
                'answer': f['answer'],
                'position': i + 1
            } for i, f in enumerate(faqs)]).execute()
            # Marquer le produit
            supabase.table('products').update(
                {'faq_generated': True}
            ).eq('id', pid).execute()
            ok += 1
        except Exception as e:
            log.error(f"  Erreur {pid}: {e}")
            err += 1
    return ok, err


def run(batch_size: int = 200, only_missing: bool = True):
    log.info("=== GÉNÉRATION FAQ ===")

    q = supabase.table('products').select(
        'id,name,brand,category,description,school_level'
    )
    if only_missing:
        q = q.eq('faq_generated', False)
    products = q.limit(batch_size).execute().data

    if not products:
        log.info("✅ Tous les produits ont une FAQ.")
        return

    log.info(f"{len(products)} produits à traiter")

    total_ok = total_err = 0
    for i in range(0, len(products), 100):
        chunk = products[i:i + 100]
        log.info(f"\nChunk {i // 100 + 1} ({len(chunk)} produits)")
        results = send_batch(chunk)
        ok, err = save_faqs(results)
        total_ok += ok
        total_err += err
        log.info(f"  ✅ {ok} OK / {err} erreurs")

    cost_est = total_ok * 0.0003
    log.info(f"\n=== FIN : {total_ok} FAQs générées · ~{cost_est:.2f}€ ===")


if __name__ == '__main__':
    batch = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    run(batch, '--all' not in sys.argv)

# COMMANDES :
# python agents/generation_faq.py 200
# python agents/generation_faq.py 10000 --all
