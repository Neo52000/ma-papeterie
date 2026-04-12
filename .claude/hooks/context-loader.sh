#!/usr/bin/env bash
#
# context-loader.sh — Claude Code UserPromptSubmit hook
# Détecte les mots-clés dans les prompts et injecte les références pertinentes.
#
# Entrée : JSON sur stdin { "prompt": "texte utilisateur", ... }
# Sortie  : stdout injecté dans le contexte de Claude
# Exit 0 + sortie = contexte injecté, Exit 0 + rien = pas d'injection
#

set -euo pipefail

# --- 1. Lire et parser l'entrée JSON ---
input=$(cat)
prompt=$(echo "$input" | jq -r '.prompt // empty')

if [[ -z "$prompt" ]]; then
  exit 0
fi

# --- 2. Déterminer le répertoire projet ---
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  PROJECT_DIR="$CLAUDE_PROJECT_DIR"
else
  PROJECT_DIR=$(echo "$input" | jq -r '.cwd // empty')
fi

REFS_DIR="${PROJECT_DIR}/.github/agents/references"

if [[ ! -d "$REFS_DIR" ]]; then
  exit 0
fi

# --- 3. Convertir en minuscules ---
prompt_lower=$(echo "$prompt" | tr '[:upper:]' '[:lower:]')

# --- 4. Détecter les contextes par mots-clés ---
declare -a MATCHES=()

# ALKOR Sync
if echo "$prompt_lower" | grep -qE 'alkor|scraping|scrape|supplier.?sync|crawl.?job|image.?collect|import.?alkor|supplier.?offer'; then
  MATCHES+=("alkor-sync.md")
fi

# B2B Pricing
if echo "$prompt_lower" | grep -qE 'pricing|price.?grid|customer.?grid|margin|discount|volume.?discount|prix|marge|tarif|remise|palier'; then
  MATCHES+=("b2b-pricing.md")
fi

# Hook Patterns
if echo "$prompt_lower" | grep -qE 'custom.?hook|useproduct|usecategor|useb2b|data.?fetch|real.?time|tanstack|usequery'; then
  MATCHES+=("hooks-patterns.md")
fi

# SEO Machine (charge les 2 fichiers SEO ensemble)
if echo "$prompt_lower" | grep -qE 'seo|blog.?writ|content.?optim|keyword.?research|landing.?page|seo.?machine'; then
  MATCHES+=("seo-machine-integration.md")
  MATCHES+=("seo-machine-blog-guide.md")
fi

# --- 5. Aucun match → sortie silencieuse ---
if [[ ${#MATCHES[@]} -eq 0 ]]; then
  exit 0
fi

# --- 6. Dédupliquer ---
declare -A SEEN=()
declare -a UNIQUE_MATCHES=()
for match in "${MATCHES[@]}"; do
  if [[ -z "${SEEN[$match]:-}" ]]; then
    SEEN[$match]=1
    UNIQUE_MATCHES+=("$match")
  fi
done

# --- 7. Construire la sortie ---
output=""
loaded_names=()

for ref_file in "${UNIQUE_MATCHES[@]}"; do
  filepath="${REFS_DIR}/${ref_file}"
  if [[ -f "$filepath" ]]; then
    name=$(echo "$ref_file" | sed 's/\.md$//' | sed 's/-/ /g')
    loaded_names+=("$name")
    output+="
---
## Reference auto-chargee: ${name}
---

$(cat "$filepath")

"
  fi
done

# --- 8. Afficher avec en-tête résumé ---
if [[ -n "$output" ]]; then
  count=${#loaded_names[@]}
  names_joined=$(IFS=', '; echo "${loaded_names[*]}")

  echo "Context Auto-Loader: ${count} reference(s) chargee(s) [${names_joined}]"
  echo "$output"
fi

exit 0
