#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# smoke-test.sh — Tests HTTP pré-déploiement Ma-Papeterie
# Usage : BASE_URL=https://votre-domaine.com bash scripts/smoke-test.sh
#         BASE_URL=http://localhost:5173 bash scripts/smoke-test.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"
SUPABASE_URL="${SUPABASE_URL:-}"  # ex: https://xxxx.supabase.co
PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC}   $1"; ((PASS++)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

echo ""
echo "══════════════════════════════════════════════"
echo "  smoke-test.sh — Ma-Papeterie"
echo "  Base URL : $BASE_URL"
echo "══════════════════════════════════════════════"
echo ""

# ── Helper : vérifier le code HTTP d'une URL ──────────────────────────────────
check_http() {
  local url="$1"
  local expected_code="${2:-200}"
  local label="${3:-$url}"

  actual_code=$(curl -o /dev/null -s -w "%{http_code}" \
    --max-time 10 --retry 2 --retry-delay 1 \
    -L "$url" 2>/dev/null || echo "000")

  if [[ "$actual_code" == "$expected_code" ]]; then
    ok "HTTP $actual_code — $label"
  else
    fail "HTTP $actual_code (attendu: $expected_code) — $label"
  fi
}

# ── Helper : vérifier qu'une URL contient un texte ───────────────────────────
check_contains() {
  local url="$1"
  local needle="$2"
  local label="${3:-contient '$needle'}"

  body=$(curl -s --max-time 10 -L "$url" 2>/dev/null || echo "")
  if echo "$body" | grep -q "$needle"; then
    ok "$label"
  else
    fail "$label (non trouvé dans la réponse)"
  fi
}

# ── 1. Pages publiques ────────────────────────────────────────────────────────
echo "▶ 1. Pages publiques (SPA — on attend 200 sur les assets)"
check_http "$BASE_URL/" 200 "Page d'accueil"
check_http "$BASE_URL/shop" 200 "Shop"
check_http "$BASE_URL/catalogue" 200 "Catalogue"

# ── 2. robots.txt ─────────────────────────────────────────────────────────────
echo ""
echo "▶ 2. robots.txt"
check_http "$BASE_URL/robots.txt" 200 "robots.txt accessible"
check_contains "$BASE_URL/robots.txt" "Disallow: /admin" "robots.txt : Disallow /admin"

# ── 3. sitemap.xml ────────────────────────────────────────────────────────────
echo ""
echo "▶ 3. sitemap.xml"
check_http "$BASE_URL/sitemap.xml" 200 "sitemap.xml accessible"

# ── 4. Pages admin — doit retourner 200 (SPA gère la protection côté client)
#    On s'assure surtout que l'app ne crash pas sur ces routes.
echo ""
echo "▶ 4. Routes admin (SPA — pas de 403 serveur attendu)"
check_http "$BASE_URL/admin" 200 "/admin charge l'app"
check_http "$BASE_URL/admin/analytics" 200 "/admin/analytics charge l'app"

# ── 5. Edge Functions Supabase — doivent retourner 401 sans token ─────────────
echo ""
echo "▶ 5. Edge Functions Supabase (401 sans token requis)"

if [[ -z "$SUPABASE_URL" ]]; then
  info "SUPABASE_URL non défini — skip des tests Edge Functions"
  info "Relancer avec : SUPABASE_URL=https://xxxx.supabase.co bash scripts/smoke-test.sh"
else
  EF_BASE="$SUPABASE_URL/functions/v1"

  # Ces fonctions DOIVENT exiger une authentification
  PROTECTED_FNS=(
    "pricing-simulate"
    "pricing-apply"
    "pricing-rollback"
    "import-fournisseur-apply"
    "import-fournisseur-rollback"
    "process-order"
  )

  for fn in "${PROTECTED_FNS[@]}"; do
    actual=$(curl -o /dev/null -s -w "%{http_code}" \
      --max-time 10 -X POST \
      -H "Content-Type: application/json" \
      -d '{}' \
      "$EF_BASE/$fn" 2>/dev/null || echo "000")

    if [[ "$actual" == "401" || "$actual" == "403" ]]; then
      ok "HTTP $actual (protégée) — $fn"
    elif [[ "$actual" == "000" ]]; then
      fail "Impossible de joindre $fn (timeout ou connexion refusée)"
    else
      fail "HTTP $actual (attendu 401/403) — $fn — VÉRIFIER L'AUTH !"
    fi
  done
fi

# ── 6. Pas d'erreur 500 sur les routes principales ───────────────────────────
echo ""
echo "▶ 6. Vérification absence d'erreur 500"
PAGES=("/" "/shop" "/catalogue" "/robots.txt")
for page in "${PAGES[@]}"; do
  code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 -L "$BASE_URL$page" 2>/dev/null || echo "000")
  if [[ "$code" == "5"* ]]; then
    fail "HTTP 5xx sur $page"
  fi
done
ok "Aucun 5xx détecté sur les pages testées"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo -e "  ${GREEN}OK: $PASS${NC}  ${RED}FAIL: $FAIL${NC}"
echo "══════════════════════════════════════════════"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}❌ Des smoke tests ont échoué.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Tous les smoke tests sont OK.${NC}"
  exit 0
fi
