
## Integrer votre cle OpenAI comme provider IA prioritaire

### Stockage securise
Votre cle API OpenAI sera stockee comme **secret Supabase** (jamais dans le code). Elle sera accessible dans les edge functions via `Deno.env.get('OPENAI_API_KEY')`.

### Logique de bascule (fallback)
Chaque edge function utilisera une logique simple :
1. Si `OPENAI_API_KEY` est disponible → appel direct a `https://api.openai.com/v1/chat/completions` avec le modele `gpt-4o-mini`
2. Sinon → fallback sur le gateway Lovable AI existant (`LOVABLE_API_KEY`)

Cela garantit que l'application continue de fonctionner meme si la cle OpenAI expire ou est supprimee.

### Fonctions concernees (9 edge functions)
| Fonction | Usage IA |
|----------|----------|
| agent-seo | Generation meta SEO |
| detect-pricing-opportunities | Analyse ecarts prix |
| optimize-reorder | Optimisation reappro |
| predict-sales | Predictions ventes |
| match-products | Matching produits |
| ai-import-catalog | Import catalogue intelligent |
| import-products-csv | Enrichissement CSV |
| generate-recommendations | Recommandations personnalisees |
| process-school-list | Traitement listes scolaires |

### Implementation technique

**Etape 1** : Stocker le secret `OPENAI_API_KEY` via l'outil Supabase secrets

**Etape 2** : Creer un helper partage `_shared/ai-client.ts` pour centraliser la logique :

```text
fonction callAI(messages, options):
  si OPENAI_API_KEY existe:
    → POST https://api.openai.com/v1/chat/completions
    → modele: gpt-4o-mini (ou gpt-4o si specifie)
    → headers: Authorization: Bearer OPENAI_API_KEY
  sinon:
    → POST https://ai.gateway.lovable.dev/v1/chat/completions
    → headers: Authorization: Bearer LOVABLE_API_KEY
  retourne la reponse JSON
```

**Etape 3** : Modifier les 9 edge functions pour utiliser le helper au lieu d'appeler directement le gateway Lovable AI. Cela remplacera les blocs `fetch('https://ai.gateway.lovable.dev/...')` par un simple appel `callAI(messages, { tools, tool_choice })`.

### Avantages
- **Priorite OpenAI** comme demande
- **Fallback automatique** sur Lovable AI si la cle OpenAI est absente
- **Code centralise** : un seul endroit a modifier pour changer de modele ou de provider
- **Aucun impact client** : le frontend ne change pas
