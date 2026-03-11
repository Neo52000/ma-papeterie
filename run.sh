#!/bin/bash
# Pipeline SEO ma-papeterie.fr — Orchestrateur
set -e

# Charger les variables d'environnement
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Vérifier les variables requises
if [ -z "$SUPABASE_URL" ] && [ -n "$VITE_SUPABASE_URL" ]; then
    export SUPABASE_URL="$VITE_SUPABASE_URL"
fi

for var in SUPABASE_URL SUPABASE_SERVICE_KEY ANTHROPIC_API_KEY; do
    if [ -z "${!var}" ]; then
        echo "❌ Variable manquante : $var"
        echo "   Ajoutez-la dans .env"
        exit 1
    fi
done

BATCH=${1:-100}

echo "╔══════════════════════════════════════╗"
echo "║  PIPELINE SEO MA-PAPETERIE.FR        ║"
echo "║  Batch : ${BATCH} produits            ║"
echo "╚══════════════════════════════════════╝"

echo ""
echo "▶ [1/7] Migrations SQL..."
python agents/migrations.py

echo ""
echo "▶ [2/7] Scoring 20/80..."
python agents/scoring_top_produits.py

echo ""
echo "▶ [3/7] Listes scolaires (14 niveaux)..."
python agents/listes_scolaires.py

echo ""
echo "▶ [4/7] Pipeline photos (${BATCH} produits)..."
python agents/pipeline_photos.py $BATCH

echo ""
echo "▶ [5/7] FAQ SEO (${BATCH} produits)..."
python agents/generation_faq.py $BATCH

echo ""
echo "▶ [6/7] Métadonnées SEO (${BATCH} produits)..."
python agents/generation_seo_meta.py $BATCH

echo ""
echo "▶ [7/7] Schema.org (${BATCH} produits)..."
python agents/generation_schema.py $BATCH

echo ""
echo "✅ PIPELINE TERMINÉ — voir exports/ et logs/"
echo ""
echo "Vérifications :"
echo "  - exports/top_produits_*.csv"
echo "  - logs/photos.log"
echo "  - logs/faq.log"
echo "  - logs/seo_meta.log"
echo "  - logs/schema.log"
echo "  - logs/listes.log"
