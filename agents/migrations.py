#!/usr/bin/env python3
"""
Migrations SQL — ma-papeterie.fr
Ajoute les colonnes manquantes à la table products
et crée la table product_faqs.
Adapté au schéma existant (tables normalisées product_seo, product_images).
"""
import os
import sys
import logging
from pathlib import Path

Path('logs').mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler('logs/migrations.log'), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

# Validation des variables d'environnement
REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
if missing:
    log.error(f"Variables d'environnement manquantes : {', '.join(missing)}")
    log.error("Ajoutez-les dans .env :")
    log.error("  SUPABASE_URL=https://votre-projet.supabase.co")
    log.error("  SUPABASE_SERVICE_KEY=votre-service-role-key")
    sys.exit(1)

from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

MIGRATIONS = [
    # ── Colonnes manquantes sur products ──
    """ALTER TABLE products
        ADD COLUMN IF NOT EXISTS short_description TEXT,
        ADD COLUMN IF NOT EXISTS school_level TEXT,
        ADD COLUMN IF NOT EXISTS tags TEXT[],
        ADD COLUMN IF NOT EXISTS usage_types TEXT[],
        ADD COLUMN IF NOT EXISTS certifications TEXT[],
        ADD COLUMN IF NOT EXISTS material TEXT,
        ADD COLUMN IF NOT EXISTS packaging_qty INTEGER,
        ADD COLUMN IF NOT EXISTS color TEXT,
        ADD COLUMN IF NOT EXISTS compatibility TEXT,
        ADD COLUMN IF NOT EXISTS environmental_score FLOAT,
        ADD COLUMN IF NOT EXISTS has_video BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS video_url TEXT,
        ADD COLUMN IF NOT EXISTS video_youtube_id TEXT,
        ADD COLUMN IF NOT EXISTS is_top_product BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS top_product_score FLOAT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS top_product_reason TEXT,
        ADD COLUMN IF NOT EXISTS total_revenue_12m FLOAT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_orders_12m INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS images_processed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS faq_generated BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS schema_generated BOOLEAN DEFAULT FALSE;""",

    # ── Table product_faqs ──
    """CREATE TABLE IF NOT EXISTS product_faqs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        position INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );""",

    # ── Index sur product_faqs ──
    "CREATE INDEX IF NOT EXISTS idx_product_faqs_product_id ON product_faqs(product_id);",

    # ── Index sur products pour le pipeline ──
    "CREATE INDEX IF NOT EXISTS idx_products_is_top ON products(is_top_product);",
    "CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean);",
    "CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);",
    "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);",
    "CREATE INDEX IF NOT EXISTS idx_products_images_processed ON products(images_processed);",
    "CREATE INDEX IF NOT EXISTS idx_products_faq_generated ON products(faq_generated);",
    "CREATE INDEX IF NOT EXISTS idx_products_schema_generated ON products(schema_generated);",
]


def run():
    log.info("=== MIGRATIONS SQL ===")
    ok = err = 0

    for i, sql in enumerate(MIGRATIONS, 1):
        label = sql.strip()[:80].replace('\n', ' ')
        try:
            supabase.postgrest.rpc('', {}).execute  # noqa — vérif connexion
            supabase.rpc('exec_sql', {'query': sql}).execute()
            log.info(f"  [{i}/{len(MIGRATIONS)}] OK : {label}...")
            ok += 1
        except Exception as e:
            # Tentative directe via postgrest si rpc exec_sql n'existe pas
            try:
                from supabase._sync.client import SyncClient
                # Utiliser la connexion directe postgres si disponible
                supabase.table('products').select('id').limit(0).execute()
                log.warning(f"  [{i}/{len(MIGRATIONS)}] RPC exec_sql indisponible, "
                            f"migration à exécuter manuellement dans Supabase SQL Editor :")
                log.warning(f"    {sql}")
                err += 1
            except Exception:
                log.error(f"  [{i}/{len(MIGRATIONS)}] ERREUR : {e}")
                err += 1

    if err > 0:
        log.warning(f"\n⚠️  {err} migrations nécessitent une exécution manuelle.")
        log.warning("Copiez les requêtes SQL ci-dessus dans Supabase SQL Editor :")
        log.warning("  https://supabase.com/dashboard → SQL Editor")
        log.info("\n📋 SQL complet à exécuter manuellement :")
        for sql in MIGRATIONS:
            print(sql)
            print()
    else:
        log.info(f"\n✅ {ok} migrations exécutées avec succès")

    # Vérification : tester que les colonnes existent
    log.info("\n🔍 Vérification des colonnes...")
    try:
        result = supabase.table('products').select(
            'id,short_description,school_level,is_top_product,'
            'images_processed,faq_generated,schema_generated'
        ).limit(1).execute()
        log.info("  ✅ Colonnes products vérifiées")
    except Exception as e:
        log.error(f"  ❌ Colonnes manquantes : {e}")

    try:
        result = supabase.table('product_faqs').select('id').limit(0).execute()
        log.info("  ✅ Table product_faqs vérifiée")
    except Exception as e:
        log.warning(f"  ⚠️  Table product_faqs non trouvée : {e}")

    # Vérifier les tables existantes (ne pas recréer)
    for table in ['product_seo', 'product_images', 'school_lists',
                  'school_list_items', 'school_list_templates']:
        try:
            supabase.table(table).select('id').limit(0).execute()
            log.info(f"  ✅ Table {table} existante (non modifiée)")
        except Exception:
            log.warning(f"  ⚠️  Table {table} non trouvée")


if __name__ == '__main__':
    run()
