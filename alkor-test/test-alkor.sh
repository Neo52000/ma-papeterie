#!/usr/bin/env bash
# test-alkor.sh — Smoke tests pour les Edge Functions Supabase Alkor.
#
# Exécute une série d'appels HTTP contre les fonctions :
#   - import-alkor          (dry-run + cas d'erreur)
#   - import-alkor-prices   (cas d'erreur uniquement, pas de side-effect)
#   - trigger-alkor-sync    (cas d'erreur uniquement, pas de dispatch)
#
# Variables requises :
#   SUPABASE_URL          ex: https://xxx.supabase.co
#   SUPABASE_ADMIN_JWT    JWT d'un user admin (récupéré via supabase.auth.signIn
#                         ou copié depuis localStorage de l'admin connecté)
#
# Variables optionnelles :
#   SUPABASE_ANON_KEY     anon key (envoyée dans l'en-tête `apikey`, requise
#                         par l'API Gateway Supabase si activée)
#   FIXTURES_DIR          chemin vers les fixtures (défaut: ./fixtures)
#   VERBOSE=1             affiche les corps de réponse complets
#
# Usage :
#   cd alkor-test
#   export SUPABASE_URL="https://xxx.supabase.co"
#   export SUPABASE_ADMIN_JWT="eyJ..."
#   ./test-alkor.sh

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="${FIXTURES_DIR:-$SCRIPT_DIR/fixtures}"
VERBOSE="${VERBOSE:-0}"

PASS=0
FAIL=0
FAILED_TESTS=()

# ── Couleurs (désactivées si pas un TTY) ───────────────────────────────────────
if [ -t 1 ]; then
  RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BOLD=$'\e[1m'; RESET=$'\e[0m'
else
  RED=""; GREEN=""; YELLOW=""; BOLD=""; RESET=""
fi

log()  { printf '%s\n' "$*"; }
info() { printf '%s[INFO]%s %s\n' "$YELLOW" "$RESET" "$*"; }
err()  { printf '%s[ERROR]%s %s\n' "$RED" "$RESET" "$*" >&2; }

# ── Validation des variables d'env ─────────────────────────────────────────────
if [ -z "${SUPABASE_URL:-}" ]; then
  err "SUPABASE_URL non défini. Exporte: SUPABASE_URL=https://<project>.supabase.co"
  exit 2
fi
if [ -z "${SUPABASE_ADMIN_JWT:-}" ]; then
  err "SUPABASE_ADMIN_JWT non défini. Exporte un JWT d'un utilisateur admin."
  exit 2
fi

# Strip trailing slash
SUPABASE_URL="${SUPABASE_URL%/}"
FN_BASE="$SUPABASE_URL/functions/v1"

if ! command -v curl >/dev/null 2>&1; then
  err "curl est requis"; exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  err "jq est requis (apt-get install jq / brew install jq)"; exit 2
fi

# ── Helpers ─────────────────────────────────────────────────────────────────────
# Effectue un POST et écrit la réponse dans $TMP_BODY, le code HTTP dans $HTTP_CODE.
http_post() {
  local url="$1"; shift
  local payload="$1"; shift
  local auth_header="$1"; shift  # "admin" | "none" | "bad"

  TMP_BODY="$(mktemp -t alkor-test.XXXXXX)"

  local -a headers=(-H "Content-Type: application/json")
  case "$auth_header" in
    admin)
      headers+=(-H "Authorization: Bearer $SUPABASE_ADMIN_JWT")
      ;;
    bad)
      headers+=(-H "Authorization: Bearer invalid.jwt.token")
      ;;
    none)
      ;;
  esac
  if [ -n "${SUPABASE_ANON_KEY:-}" ]; then
    headers+=(-H "apikey: $SUPABASE_ANON_KEY")
  fi

  HTTP_CODE=$(printf '%s' "$payload" | curl -sS -o "$TMP_BODY" -w "%{http_code}" \
    -X POST "$url" \
    "${headers[@]}" \
    --data-binary @- \
    --max-time 30 \
    || echo "000")
}

# Assert: $1 = expected_code, $2 = test_name, $3 = jq filter (optional, must return non-empty)
assert_status() {
  local expected="$1"; local name="$2"; local jq_check="${3:-}"

  if [ "$HTTP_CODE" = "$expected" ]; then
    if [ -n "$jq_check" ]; then
      if jq -e "$jq_check" "$TMP_BODY" >/dev/null 2>&1; then
        printf '  %s✓%s %s (HTTP %s)\n' "$GREEN" "$RESET" "$name" "$HTTP_CODE"
        PASS=$((PASS + 1))
      else
        printf '  %s✗%s %s (HTTP %s OK, mais jq check failed: %s)\n' \
          "$RED" "$RESET" "$name" "$HTTP_CODE" "$jq_check"
        printf '    Body: %s\n' "$(head -c 500 "$TMP_BODY")"
        FAIL=$((FAIL + 1))
        FAILED_TESTS+=("$name")
      fi
    else
      printf '  %s✓%s %s (HTTP %s)\n' "$GREEN" "$RESET" "$name" "$HTTP_CODE"
      PASS=$((PASS + 1))
    fi
  else
    printf '  %s✗%s %s (attendu HTTP %s, reçu %s)\n' \
      "$RED" "$RESET" "$name" "$expected" "$HTTP_CODE"
    printf '    Body: %s\n' "$(head -c 500 "$TMP_BODY")"
    FAIL=$((FAIL + 1))
    FAILED_TESTS+=("$name")
  fi

  if [ "$VERBOSE" = "1" ]; then
    printf '    --- response body ---\n'
    jq . "$TMP_BODY" 2>/dev/null || cat "$TMP_BODY"
    printf '    ---------------------\n'
  fi

  rm -f "$TMP_BODY"
}

# ── Banner ──────────────────────────────────────────────────────────────────────
log ""
log "${BOLD}Alkor Edge Functions — smoke tests${RESET}"
log "  SUPABASE_URL : $SUPABASE_URL"
log "  Fixtures     : $FIXTURES_DIR"
log ""

# ── Tests : import-alkor ───────────────────────────────────────────────────────
log "${BOLD}1. import-alkor${RESET}"

info "1.1 dry-run avec fixture valide"
PAYLOAD="$(cat "$FIXTURES_DIR/import-alkor-sample.json")"
http_post "$FN_BASE/import-alkor" "$PAYLOAD" "admin"
assert_status "200" "dry-run renvoie 200 + dry_run:true" '.dry_run == true'

info "1.2 rows vide → 400"
PAYLOAD="$(cat "$FIXTURES_DIR/import-alkor-empty.json")"
http_post "$FN_BASE/import-alkor" "$PAYLOAD" "admin"
assert_status "400" "rows vide rejeté" '.error // empty | length > 0'

info "1.3 sans authentification → 401"
PAYLOAD="$(cat "$FIXTURES_DIR/import-alkor-sample.json")"
http_post "$FN_BASE/import-alkor" "$PAYLOAD" "none"
assert_status "401" "auth manquante rejetée"

info "1.4 JWT invalide → 401"
http_post "$FN_BASE/import-alkor" "$PAYLOAD" "bad"
assert_status "401" "JWT invalide rejeté"

# ── Tests : import-alkor-prices ────────────────────────────────────────────────
log ""
log "${BOLD}2. import-alkor-prices${RESET} (cas d'erreur uniquement — pas de mutation)"

info "2.1 rows vide → 400"
PAYLOAD="$(cat "$FIXTURES_DIR/import-alkor-prices-empty.json")"
http_post "$FN_BASE/import-alkor-prices" "$PAYLOAD" "admin"
assert_status "400" "rows vide rejeté" '.error // empty | length > 0'

info "2.2 sans authentification → 401"
http_post "$FN_BASE/import-alkor-prices" "$PAYLOAD" "none"
assert_status "401" "auth manquante rejetée"

# ── Tests : trigger-alkor-sync ─────────────────────────────────────────────────
log ""
log "${BOLD}3. trigger-alkor-sync${RESET} (cas d'erreur uniquement — pas de dispatch GitHub)"

info "3.1 sans authentification → 401"
http_post "$FN_BASE/trigger-alkor-sync" "{}" "none"
assert_status "401" "auth manquante rejetée"

info "3.2 JWT invalide → 401"
http_post "$FN_BASE/trigger-alkor-sync" "{}" "bad"
assert_status "401" "JWT invalide rejeté"

# ── Récapitulatif ──────────────────────────────────────────────────────────────
log ""
log "${BOLD}Résultats${RESET} : ${GREEN}${PASS} passés${RESET}, ${RED}${FAIL} échoués${RESET}"
if [ "$FAIL" -gt 0 ]; then
  log ""
  log "${RED}Tests échoués :${RESET}"
  for t in "${FAILED_TESTS[@]}"; do
    log "  - $t"
  done
  exit 1
fi
exit 0
