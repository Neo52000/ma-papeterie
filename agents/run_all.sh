#!/bin/bash
set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Ensure required dirs exist
mkdir -p "$PROJECT_DIR/logs" "$PROJECT_DIR/exports"

cd "$PROJECT_DIR"

echo "========================================"
echo "PIPELINE COMPLET MA-PAPETERIE.FR"
echo "========================================"
echo ""

echo "[1/6] Scoring produits 20/80..."
python agents/scoring_top_produits.py
echo ""

echo "[2/6] Pipeline photos (50 premiers produits)..."
python agents/pipeline_photos.py 50
echo ""

echo "[3/6] Generation FAQs (100 premiers produits)..."
python agents/generation_faq.py 100
echo ""

echo "[4/6] Generation Schema.org JSON-LD..."
python agents/generation_schema.py 200
echo ""

echo "[5/6] Generation listes scolaires..."
python agents/listes_scolaires.py
echo ""

echo "[6/6] Generation SEO metadonnees..."
python agents/generation_seo_meta.py 200
echo ""

echo "========================================"
echo "PIPELINE TERMINE — verifier les logs/"
echo "========================================"
