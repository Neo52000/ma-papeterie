# Politique IA — CRM ma-papeterie.fr

## Configuration

### Fournisseurs supportés

| Provider   | Modèle par défaut         | Variable env          |
|------------|---------------------------|-----------------------|
| Anthropic  | claude-sonnet-4-6         | `ANTHROPIC_API_KEY`   |
| OpenAI     | gpt-4o                    | `OPENAI_API_KEY`      |

**Sélection via :**
```env
AI_PROVIDER=anthropic   # ou openai
```

Le CRM bascule automatiquement sur le fournisseur configuré sans changer le code applicatif.

---

## Cas d'usage IA

### 1. Scoring prospect

**Endpoint API :** `POST /api/ai/score-prospect`

**Input :**
```json
{
  "entity_id": "uuid",
  "company_name": "SARL Dupont Impression",
  "naf_code": "1812Z",
  "naf_label": "Autre imprimerie",
  "company_type": "entreprise",
  "city": "Chaumont",
  "distance_km": 2.4
}
```

**Prompt système :**
```
Tu es un expert commercial pour une papeterie locale (ma-papeterie.fr) à Chaumont, Haute-Marne.
Tu dois évaluer le potentiel commercial d'un prospect B2B.

Critères de scoring (total 100 points) :
- Proximité géographique : 0–25 pts (0 km = 25 pts, 20 km = 0 pt)
- Secteur NAF favorable (écoles, mairies, cabinets, artisans) : 0–30 pts
- Taille entreprise (PME 10–50 = idéal) : 0–20 pts
- Type structure (collectivité, association = +bonus) : 0–15 pts
- Présence email contact : 0–10 pts

Réponds UNIQUEMENT en JSON valide :
{
  "score": <0-100>,
  "temperature": "<froid|tiede|chaud>",
  "reasoning": "<1 phrase explication>",
  "priority": "<basse|normale|haute>"
}
```

**Seuils température :**
- `froid` : score 0–39
- `tiede` : score 40–69
- `chaud` : score 70–100

---

### 2. Génération email prospection

**Endpoint API :** `POST /api/ai/generate-email`

**Input :**
```json
{
  "entity_id": "uuid",
  "purpose": "prospection_initiale"
}
```

**Prompt système :**
```
Tu es le responsable commercial de ma-papeterie.fr, papeterie locale à Chaumont (Haute-Marne).
Rédige un email de prospection B2B professionnel et chaleureux pour {{company_name}}.

Contexte :
- Destinataire : {{company_name}}, {{company_type}}, situé à {{city}} ({{distance_km}} km de Chaumont)
- Secteur : {{naf_label}}
- Expéditeur : contact@ma-papeterie.fr

Règles :
- Email court (150–200 mots maximum)
- Accroche personnalisée selon le secteur
- Mettre en avant : livraison locale, service de proximité, impression sur place
- Appel à l'action clair (réponse email ou rappel téléphonique)
- Ton professionnel mais humain, pas robotique
- NE PAS inventer de chiffres ou de promotions fictives

Réponds en JSON valide :
{
  "subject": "<objet email>",
  "body_text": "<corps email texte brut>",
  "body_html": "<corps email HTML simple>"
}
```

**Cas d'usage `purpose` :**
| Purpose               | Description                              |
|-----------------------|------------------------------------------|
| `prospection_initiale`| Premier contact                          |
| `relance_j7`          | Relance 7 jours après 1er email          |
| `relance_j14`         | Relance 14 jours (dernier essai)         |
| `devis_followup`      | Suivi après envoi devis                  |

---

### 3. Classification réponse email

**Endpoint API :** `POST /api/ai/classify-reply`

**Input :**
```json
{
  "subject": "Re: Proposition ma-papeterie.fr",
  "body_text": "Bonjour, oui votre offre m'intéresse, pouvez-vous me faire un devis ?"
}
```

**Prompt système :**
```
Analyse cette réponse email d'un prospect commercial.
Classe la réponse et propose le prochain statut CRM.

Réponds UNIQUEMENT en JSON :
{
  "sentiment": "<positif|neutre|negatif>",
  "intent": "<interesse|devis|rdv|refus|sans_suite|question>",
  "suggested_status": "<contacte|interesse|devis_envoye|refus>",
  "suggested_stage": "<contacte|qualification|interesse|devis|perdu>",
  "suggested_task": "<null|appel|devis|rdv>",
  "summary": "<1 phrase résumant la réponse>"
}
```

---

### 4. Script d'appel téléphonique

**Endpoint API :** `POST /api/ai/call-script`

**Input :**
```json
{
  "entity_id": "uuid"
}
```

**Prompt système :**
```
Tu es le responsable commercial de ma-papeterie.fr.
Génère un script d'appel téléphonique court pour prospecter {{company_name}} ({{naf_label}}, {{city}}).

Structure du script :
1. Introduction (5 sec)
2. Accroche personnalisée (15 sec)
3. Questions de découverte (2–3 questions)
4. Proposition de valeur adaptée
5. Gestion objections courantes (2 max)
6. Clôture (prochain RDV / envoi devis)

Format : texte structuré lisible à voix haute, balisé [INTRO], [ACCROCHE], [QUESTIONS], [VALEUR], [OBJECTIONS], [CLOTURE]
```

---

### 5. Déduplication intelligente

**Endpoint API :** `POST /api/ai/check-duplicate`

**Logique principale (sans IA) :**
```javascript
// Règles de déduplication en base avant appel IA
// 1. Même SIRET → doublon certain
// 2. Même email (normalisé) → doublon probable
// 3. Même company_name (normalisé) + même code postal → doublon probable

// L'IA intervient uniquement pour les cas ambigus :
// ex: "SARL Dupont" vs "Dupont SARL" vs "Dupont Impression"
```

---

## Format journalisation (`crm_ai_logs`)

Chaque appel IA est automatiquement loggé :

```sql
INSERT INTO crm_ai_logs (
  account_id, entity_id,
  provider, model_name,
  prompt, response,
  prompt_tokens, completion_tokens, total_tokens,
  cost_estimate,
  purpose, status,
  created_by
) VALUES (...);
```

**Estimation coûts (2026) :**

| Modèle              | Input (M tokens) | Output (M tokens) | Coût typique/appel |
|---------------------|------------------|-------------------|--------------------|
| claude-sonnet-4-6   | $3               | $15               | ~$0.002            |
| gpt-4o              | $5               | $15               | ~$0.003            |

---

## Limites et contrôles

```javascript
// Middleware rate limiting IA (src/middleware/aiRateLimit.js)
const AI_LIMITS = {
  per_request_max_tokens: 2000,   // Output max par appel
  per_day_max_calls: 500,         // Appels max/jour (mono-user)
  per_entity_max_emails: 3,       // Max 3 emails IA générés par prospect
};
```

**Règles métier :**
- Aucun email n'est envoyé automatiquement sans passage en statut `a_contacter` confirmé
- Le score IA est indicatif, l'humain garde la main sur la décision finale
- Les prompts sont loggés intégralement pour audit
- Les données personnelles des prospects ne sont jamais envoyées à l'IA au-delà du minimum nécessaire (nom entreprise, ville, secteur — pas de données de contact personnelles)

---

## Service IA centralisé (Node.js)

```javascript
// src/services/ai.service.js

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'anthropic';
    if (this.provider === 'anthropic') {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.model = 'claude-sonnet-4-6';
    } else {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = 'gpt-4o';
    }
  }

  async complete(systemPrompt, userPrompt, options = {}) {
    const start = Date.now();
    try {
      let response;
      if (this.provider === 'anthropic') {
        const msg = await this.client.messages.create({
          model: this.model,
          max_tokens: options.maxTokens || 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });
        response = {
          text: msg.content[0].text,
          promptTokens: msg.usage.input_tokens,
          completionTokens: msg.usage.output_tokens
        };
      } else {
        const msg = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: options.maxTokens || 1024
        });
        response = {
          text: msg.choices[0].message.content,
          promptTokens: msg.usage.prompt_tokens,
          completionTokens: msg.usage.completion_tokens
        };
      }

      // Toujours loguer
      await this.log({ systemPrompt, userPrompt, response, purpose: options.purpose, entityId: options.entityId });

      return response;
    } catch (err) {
      await this.log({ systemPrompt, userPrompt, error: err.message, purpose: options.purpose, entityId: options.entityId });
      throw err;
    }
  }

  async log({ systemPrompt, userPrompt, response, error, purpose, entityId }) {
    // INSERT INTO crm_ai_logs ...
  }
}

module.exports = new AIService();
```
