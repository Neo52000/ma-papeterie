#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# check-release.sh — Audit pré-déploiement Ma-Papeterie
# Usage : bash scripts/check-release.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail
PASS=0; FAIL=0; WARN=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC}   $1"; ((PASS++)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARN++)); }

echo ""
echo "══════════════════════════════════════════════"
echo "  check-release.sh — Ma-Papeterie"
echo "══════════════════════════════════════════════"
echo ""

# ── 1. TypeScript ─────────────────────────────────────────────────────────────
echo "▶ 1. TypeScript"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  fail "npx tsc --noEmit : erreurs TypeScript détectées"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -10
else
  ok "npx tsc --noEmit : aucune erreur"
fi

# ── 2. Secrets dans le code source ────────────────────────────────────────────
echo ""
echo "▶ 2. Secrets dans le code source"

SECRET_PATTERNS=(
  "SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"][a-zA-Z0-9._-]{20,}"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{20,}"
  "sk_live_[a-zA-Z0-9]{20,}"
  "sk_test_[a-zA-Z0-9]{20,}"
  "STRIPE_SECRET\s*=\s*['\"]sk_"
  "password\s*[:=]\s*['\"][^'\"]{8,}"
  "secret\s*[:=]\s*['\"][^'\"]{8,}"
)

found_secrets=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  matches=$(grep -rEI --include="*.ts" --include="*.tsx" --include="*.js" \
    --exclude-dir=node_modules --exclude-dir=.git \
    "$pattern" . 2>/dev/null || true)
  if [[ -n "$matches" ]]; then
    fail "Potentiel secret détecté (pattern: $pattern)"
    echo "$matches" | head -5
    ((found_secrets++))
  fi
done
if [[ $found_secrets -eq 0 ]]; then
  ok "Aucun secret apparent dans src/"
fi

# ── 3. .env dans .gitignore ───────────────────────────────────────────────────
echo ""
echo "▶ 3. .env dans .gitignore"
if grep -qE "^\.env$|^\.env\.\*" .gitignore 2>/dev/null; then
  ok ".env et .env.* figurent dans .gitignore"
else
  fail ".env ou .env.* manquants dans .gitignore"
fi
if [[ -f ".env" ]]; then
  if git ls-files --error-unmatch ".env" 2>/dev/null; then
    fail ".env est tracké par git !"
  else
    ok ".env existe localement mais n'est pas tracké par git"
  fi
fi

# ── 4. Edge Functions : verify_jwt ou validation token ───────────────────────
echo ""
echo "▶ 4. Edge Functions — authentification"
EF_DIR="supabase/functions"
missing_auth=()
if [[ -d "$EF_DIR" ]]; then
  for fn_dir in "$EF_DIR"/*/; do
    fn_name=$(basename "$fn_dir")
    idx="$fn_dir/index.ts"
    [[ ! -f "$idx" ]] && continue
    # Cherche : getUser(token) OU verify_jwt OU Authorization header check
    if ! grep -qE "getUser|verify_jwt|Authorization|authHeader" "$idx" 2>/dev/null; then
      missing_auth+=("$fn_name")
    fi
  done
  if [[ ${#missing_auth[@]} -eq 0 ]]; then
    ok "Toutes les Edge Functions semblent vérifier l'authentification"
  else
    warn "Edge Functions sans vérification d'auth apparente :"
    for fn in "${missing_auth[@]}"; do
      echo "       - $fn"
    done
  fi
else
  warn "Répertoire $EF_DIR introuvable, audit edge functions ignoré"
fi

# ── 5. RLS — tables sans politiques ──────────────────────────────────────────
echo ""
echo "▶ 5. RLS (hors Supabase — vérification locale des migrations)"
# On cherche les CREATE TABLE sans RLS enabled dans les migrations
migrations_dir="supabase/migrations"
tables_no_rls=()
if [[ -d "$migrations_dir" ]]; then
  for sql_file in "$migrations_dir"/*.sql; do
    [[ ! -f "$sql_file" ]] && continue
    # Extraire les tables créées
    while IFS= read -r table; do
      # Vérifier si ALTER TABLE ... ENABLE ROW LEVEL SECURITY suit
      if ! grep -q "ENABLE ROW LEVEL SECURITY" "$sql_file" 2>/dev/null; then
        tables_no_rls+=("$(basename "$sql_file"): $table")
      fi
    done < <(grep -oP "(?<=CREATE TABLE IF NOT EXISTS |CREATE TABLE )\w+" "$sql_file" 2>/dev/null || true)
  done
  if [[ ${#tables_no_rls[@]} -eq 0 ]]; then
    ok "Toutes les migrations activent RLS"
  else
    warn "Migrations sans ENABLE ROW LEVEL SECURITY (vérification manuelle conseillée) :"
    for t in "${tables_no_rls[@]}"; do
      echo "       - $t"
    done
  fi
else
  warn "Répertoire $migrations_dir introuvable"
fi

# ── 6. console.log de debug dans src/ ────────────────────────────────────────
echo ""
echo "▶ 6. console.log de debug"
debug_logs=$(grep -rn "console\.log\|console\.error\|console\.warn" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.git \
  src/ 2>/dev/null || true)
if [[ -n "$debug_logs" ]]; then
  count=$(echo "$debug_logs" | wc -l | tr -d ' ')
  warn "$count occurrence(s) de console.log/error/warn dans src/ :"
  echo "$debug_logs" | head -10
else
  ok "Aucun console.log dans src/"
fi

# ── 7. robots.txt — /admin Disallow ──────────────────────────────────────────
echo ""
echo "▶ 7. SEO — robots.txt"
if [[ -f "public/robots.txt" ]]; then
  if grep -q "Disallow: /admin" "public/robots.txt"; then
    ok "robots.txt : Disallow /admin présent"
  else
    fail "robots.txt : Disallow /admin manquant"
  fi
else
  fail "public/robots.txt introuvable"
fi

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo -e "  ${GREEN}OK: $PASS${NC}  ${RED}FAIL: $FAIL${NC}  ${YELLOW}WARN: $WARN${NC}"
echo "══════════════════════════════════════════════"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}❌ Des problèmes critiques ont été détectés. Corriger avant le déploiement.${NC}"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Des avertissements ont été détectés. Vérifier avant le déploiement.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Tous les checks sont OK.${NC}"
  exit 0
fi
