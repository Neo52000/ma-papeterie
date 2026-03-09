require('dotenv').config();
const { query } = require('../db');

const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic';

function getProvider() {
  if (AI_PROVIDER === 'openai') {
    const { OpenAI } = require('openai');
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  const Anthropic = require('@anthropic-ai/sdk');
  return new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function complete(systemPrompt, userPrompt, options = {}) {
  const model = options.model || (AI_PROVIDER === 'openai'
    ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
    : (process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'));

  let text, promptTokens, completionTokens;

  try {
    if (AI_PROVIDER === 'openai') {
      const client = getProvider();
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: options.max_tokens || 1500,
        temperature: options.temperature || 0.7,
      });
      text = response.choices[0].message.content;
      promptTokens = response.usage?.prompt_tokens || 0;
      completionTokens = response.usage?.completion_tokens || 0;
    } else {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model,
        max_tokens: options.max_tokens || 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      text = response.content[0].text;
      promptTokens = response.usage?.input_tokens || 0;
      completionTokens = response.usage?.output_tokens || 0;
    }

    await logAI({
      entity_id: options.entity_id || null,
      provider: AI_PROVIDER,
      model_name: model,
      prompt: `${systemPrompt}\n\n${userPrompt}`.slice(0, 4000),
      response: text?.slice(0, 4000),
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      purpose: options.purpose || null,
      status: 'success',
    });

    return { text, promptTokens, completionTokens };
  } catch (err) {
    await logAI({
      entity_id: options.entity_id || null,
      provider: AI_PROVIDER,
      model_name: model,
      prompt: `${systemPrompt}\n\n${userPrompt}`.slice(0, 4000),
      response: null,
      prompt_tokens: 0,
      completion_tokens: 0,
      purpose: options.purpose || null,
      status: 'error',
      error_message: err.message,
    });
    throw err;
  }
}

async function logAI({ entity_id, provider, model_name, prompt, response, prompt_tokens, completion_tokens, purpose, status, error_message }) {
  try {
    const total = (prompt_tokens || 0) + (completion_tokens || 0);
    const cost = AI_PROVIDER === 'openai'
      ? (prompt_tokens * 0.00000015 + completion_tokens * 0.0000006)
      : (prompt_tokens * 0.00000025 + completion_tokens * 0.00000125);

    await query(
      `INSERT INTO crm_ai_logs (
        account_id, entity_id, provider, model_name, prompt, response,
        prompt_tokens, completion_tokens, total_tokens, cost_estimate,
        purpose, status, error_message
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        ACCOUNT_ID, entity_id, provider, model_name, prompt, response,
        prompt_tokens, completion_tokens, total, cost.toFixed(6),
        purpose, status, error_message || null,
      ]
    );
  } catch (logErr) {
    console.error('Failed to log AI call:', logErr.message);
  }
}

async function scoreProspect(entity) {
  const systemPrompt = `Tu es un assistant CRM pour une papeterie locale (ma-papeterie.fr) basée à Chaumont (Haute-Marne).
Tu dois scorer un prospect professionnel de 0 à 100 selon ces critères :
- Proximité géographique (rayon 20km de Chaumont) : 25 points max
- Code NAF pertinent (papeterie, imprimerie, bureau, école, administration) : 30 points max
- Taille/potentiel (nombre employés, CA estimé) : 20 points max
- Type de structure (entreprise, association, collectivité, école) : 15 points max
- Contact email disponible : 10 points max

Réponds UNIQUEMENT avec un JSON valide : {"score": 75, "temperature": "chaud", "reasoning": "...", "priority": "haute"}
temperature: "froid" (0-30), "tiede" (31-60), "chaud" (61-100)
priority: "basse", "normale", "haute", "urgente"`;

  const userPrompt = `Prospect à scorer :
Entreprise: ${entity.company_name}
Type: ${entity.company_type || 'non précisé'}
NAF: ${entity.naf_code || 'inconnu'} - ${entity.naf_label || ''}
Ville: ${entity.city || 'inconnue'} (${entity.postal_code || ''})
Distance: ${entity.distance_km ? entity.distance_km + ' km de Chaumont' : 'distance inconnue'}
Email: ${entity.email ? 'oui' : 'non'}
Dans le rayon cible: ${entity.within_target_radius ? 'oui' : 'non'}
Score actuel: ${entity.score || 0}`;

  const { text } = await complete(systemPrompt, userPrompt, {
    entity_id: entity.id,
    purpose: 'score_prospect',
    temperature: 0.3,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { score: entity.score || 0, temperature: 'froid', reasoning: text, priority: 'normale' };
  }
}

async function generateEmail(entity, purpose) {
  const systemPrompt = `Tu es un commercial pour ma-papeterie.fr, papeterie professionnelle à Chaumont (52).
Tu rédiges des emails de prospection professionnels, humains et personnalisés.
Règles :
- 150 à 200 mots maximum
- Accroche personnalisée selon le secteur d'activité
- Ton chaleureux mais professionnel
- Signature avec coordonnées de la papeterie
- Propose toujours un appel ou une visite

Réponds avec un JSON valide : {"subject": "...", "body_text": "...", "body_html": "..."}`;

  const purposes = {
    prospection: 'Premier contact pour présenter nos services',
    relance: 'Relance après un premier contact sans réponse',
    devis: 'Suivi de devis envoyé',
    fidelisation: 'Email de fidélisation client',
  };

  const userPrompt = `Rédige un email de ${purpose} pour :
Entreprise: ${entity.company_name}
Secteur (NAF): ${entity.naf_code ? `${entity.naf_code} - ${entity.naf_label}` : entity.company_type}
Ville: ${entity.city || 'Chaumont'}
Objectif: ${purposes[purpose] || purpose}
Contact: ${entity.email || 'email non disponible'}`;

  const { text } = await complete(systemPrompt, userPrompt, {
    entity_id: entity.id,
    purpose: 'generate_email',
    temperature: 0.7,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.body_text && !parsed.body_html) {
      parsed.body_html = parsed.body_text.replace(/\n/g, '<br>');
    }
    return parsed;
  } catch {
    return { subject: `Papeterie ma-papeterie.fr - ${purpose}`, body_text: text, body_html: text.replace(/\n/g, '<br>') };
  }
}

async function classifyReply(subject, bodyText, entityId) {
  const systemPrompt = `Tu es un assistant CRM. Analyse la réponse d'un prospect à un email de prospection.
Classifie selon :
- sentiment: "positif", "neutre", "negatif"
- intent: "interesse", "demande_info", "pas_interesse", "demande_rendez_vous", "demande_devis", "desabonnement", "autre"
- suggested_status: "interesse", "contacte", "refus", "devis_envoye", "a_contacter", "archive"
- suggested_stage: "qualification", "interesse", "devis", "a_contacter", "perdu"

Réponds UNIQUEMENT avec un JSON valide.`;

  const userPrompt = `Objet: ${subject}
Corps du message:
${bodyText.slice(0, 2000)}`;

  const { text } = await complete(systemPrompt, userPrompt, {
    entity_id: entityId || null,
    purpose: 'classify_reply',
    temperature: 0.2,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { sentiment: 'neutre', intent: 'autre', suggested_status: 'contacte', suggested_stage: 'qualification' };
  }
}

async function generateCallScript(entity) {
  const systemPrompt = `Tu es un commercial expert en vente B2B pour ma-papeterie.fr.
Génère un script d'appel téléphonique structuré avec les sections :
[INTRO] - Présentation rapide
[ACCROCHE] - Accroche personnalisée selon le secteur
[QUESTIONS] - Questions de qualification (3-4 max)
[VALEUR] - Proposition de valeur ma-papeterie.fr
[OBJECTIONS] - Réponses aux 2-3 objections courantes
[CLOTURE] - Fermeture vers prochain RDV ou devis

Sois concis, naturel et adapté au contexte local (Chaumont, Haute-Marne).`;

  const userPrompt = `Script pour :
Entreprise: ${entity.company_name}
Type: ${entity.company_type}
Secteur NAF: ${entity.naf_code ? `${entity.naf_code} - ${entity.naf_label}` : 'non précisé'}
Ville: ${entity.city || 'Chaumont'}
Statut actuel: ${entity.status}
Notes: ${entity.notes || 'aucune'}`;

  const { text } = await complete(systemPrompt, userPrompt, {
    entity_id: entity.id,
    purpose: 'call_script',
    max_tokens: 2000,
    temperature: 0.6,
  });

  return text;
}

module.exports = { complete, scoreProspect, generateEmail, classifyReply, generateCallScript };
