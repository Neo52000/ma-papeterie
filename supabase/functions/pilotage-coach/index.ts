// =============================================================================
// Edge Function : pilotage-coach
// Coach IA Claude pour le pilotage de ma-papeterie.fr
// Inspiré de la méthode Rivalis : franc-jeu, bienveillant mais intransigeant,
// pas de jargon, chaque constat = 1 décision concrète.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestPayload {
  conversation_id?: string;
  message: string;
  include_kpi_context?: boolean; // Default: true
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CLAUDE_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `Tu es le Conseiller en pilotage d'entreprise de ma-papeterie.fr, un e-commerce B2B/B2C de fournitures de bureau et scolaires à Chaumont, avec une boutique physique.

**Ton rôle** — inspiré de la méthode Rivalis :
- Tu guides le dirigeant vers les meilleures décisions, sans jargon, en franc-jeu
- Tu traduis les chiffres en décisions concrètes — pas de recommandations floues
- Tu es bienveillant mais intransigeant sur la réalité des faits
- Tu n'es PAS un béni-oui-oui : si quelque chose cloche, tu le dis
- Tu écoutes avant de répondre — pose des questions si le contexte manque
- Tu connais la solitude du dirigeant : ton rôle inclut le rappel de prendre du recul
- Tu ne donnes JAMAIS de conseil juridique, fiscal ou comptable — tu renvoies vers un expert

**Ton style** :
- Réponses courtes et directes (3-6 phrases max par défaut, plus long si demandé)
- Chaque réponse se termine par une action concrète OU une question de cadrage
- Tu utilises le tutoiement (relation de proximité)
- Pas d'emoji, pas de markdown lourd, pas d'anglicismes inutiles
- Tu nommes les vrais chiffres quand tu les as dans le contexte

**Les 6 questions fondamentales du pilotage** que tu gardes toujours en tête :
1. Où en suis-je ? (résultat réel, pas juste le CA)
2. Où vais-je finir l'exercice à ce rythme ?
3. Mes prix et ma marge sont-ils bons ?
4. Quel impact si j'investis ou j'embauche ?
5. Quelle trésorerie dans 30/60/90 jours ?
6. Suis-je en retard sur mes objectifs ?

**Contexte ma-papeterie.fr** :
- Multi-canal : site web B2C, site web B2B (mairies, TPE, entreprises Chaumont), boutique physique Chaumont (Shopify POS)
- Fournisseurs principaux : Liderpapel/Comlandi (espagnol), Soft-Carrier (européen) — 70k+ produits catalogue
- Secteur papeterie : marges brutes typiques 25-35%, saisonnalité forte (rentrée scolaire août-septembre)
- Le dirigeant s'appelle Elie

Quand le contexte KPI est fourni, utilise-le systématiquement pour ancrer tes réponses dans le réel.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: RequestPayload = await req.json();
    if (!body.message || typeof body.message !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Créer ou récupérer la conversation
    let conversationId = body.conversation_id;
    if (!conversationId) {
      const firstTitle = body.message.slice(0, 60).trim() || 'Nouvelle conversation';
      const { data: newConv, error: convError } = await supabase
        .from('pilotage_coach_conversations')
        .insert({ title: firstTitle })
        .select('id')
        .single();
      if (convError) throw convError;
      conversationId = newConv.id;
    }

    // 2. Récupérer l'historique de la conversation
    const { data: history, error: histError } = await supabase
      .from('pilotage_coach_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(30); // Context cap

    if (histError) throw histError;

    // 3. Construire le contexte KPI si demandé
    let kpiContextBlock = '';
    let kpiSnapshotForAudit: Record<string, unknown> | null = null;

    if (body.include_kpi_context !== false) {
      const { data: kpiOverview } = await supabase
        .from('mv_pilotage_overview_current')
        .select('*')
        .eq('channel', 'all')
        .single();

      const { data: goalProgress } = await supabase.rpc('get_goal_progress', {
        p_period: 'month',
        p_date: new Date().toISOString().slice(0, 10),
      });

      const { data: activeAlerts } = await supabase
        .from('pilotage_alerts')
        .select('severity, title, message, metric_value, threshold')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false })
        .limit(5);

      kpiSnapshotForAudit = { kpiOverview, goalProgress, activeAlerts };
      kpiContextBlock = buildKpiContextBlock(kpiOverview, goalProgress, activeAlerts);
    }

    // 4. Construire les messages pour Claude
    const claudeMessages: ClaudeMessage[] = [
      ...(history ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      {
        role: 'user',
        content: kpiContextBlock
          ? `${kpiContextBlock}\n\n---\n\n${body.message}`
          : body.message,
      },
    ];

    // 5. Enregistrer le message user
    await supabase.from('pilotage_coach_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: body.message,
      kpi_snapshot: kpiSnapshotForAudit,
    });

    // 6. Appeler Claude API
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        // Prompt caching : le SYSTEM_PROMPT (~2 KB) est stable → cache éphémère 5 min
        // Gain attendu : ~90% de réduction sur les tokens input du system à partir du 2e message
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        messages: claudeMessages,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error ${claudeResponse.status}: ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const assistantText = (claudeData.content ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.type === 'text')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => c.text)
      .join('\n');

    const tokensInput = claudeData.usage?.input_tokens ?? null;
    const tokensOutput = claudeData.usage?.output_tokens ?? null;
    // Observabilité prompt caching : logué pour vérifier le hit rate
    const cacheCreationTokens = claudeData.usage?.cache_creation_input_tokens ?? 0;
    const cacheReadTokens = claudeData.usage?.cache_read_input_tokens ?? 0;
    console.log(JSON.stringify({
      function: 'pilotage-coach',
      conversation_id: conversationId,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cache_creation: cacheCreationTokens,
      cache_read: cacheReadTokens,
    }));

    // 7. Enregistrer la réponse assistant
    const { data: assistantMsg, error: msgError } = await supabase
      .from('pilotage_coach_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantText,
        model: CLAUDE_MODEL,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
      })
      .select('id, content, created_at')
      .single();

    if (msgError) throw msgError;

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
        assistant_message: assistantMsg,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pilotage-coach] Error:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildKpiContextBlock(overview: any, goalProgress: any[], alerts: any[]): string {
  const lines: string[] = ['**Contexte KPI actuel (ma-papeterie.fr, canal "all")** :'];

  if (overview) {
    lines.push(`- CA 7j : ${fmtEur(overview.ca_ht_7d)} HT | Marge 7j : ${fmtEur(overview.marge_brute_7d)} (${fmtPct(overview.taux_marge_7d)})`);
    lines.push(`- CA 30j : ${fmtEur(overview.ca_ht_30d)} HT (${fmtDelta(overview.ca_delta_pct)} vs 30j précédents)`);
    lines.push(`- Marge 30j : ${fmtEur(overview.marge_brute_30d)} (${fmtPct(overview.taux_marge_30d)}, ${fmtDelta(overview.marge_delta_pct)})`);
    lines.push(`- Panier moyen 30j : ${fmtEur(overview.panier_moyen_30d)} HT`);
    lines.push(`- Encaissements 30j : ${fmtEur(overview.encaissements_30d)} TTC`);
    lines.push(`- Commandes 30j : ${overview.nb_orders_30d}`);
  }

  if (goalProgress && goalProgress.length > 0) {
    lines.push('\n**Objectif mensuel** :');
    for (const g of goalProgress) {
      lines.push(`- [${g.channel}] Objectif CA : ${fmtEur(g.objectif_ca_ht)} HT | Réalisé : ${fmtEur(g.realise_ca_ht)} (${fmtPct(g.progression_pct)}) | Jours restants : ${g.jours_restants}`);
      if (g.rythme_quotidien_requis > 0) {
        lines.push(`  → Rythme requis : ${fmtEur(g.rythme_quotidien_requis)}/jour pour atteindre l'objectif`);
      }
    }
  }

  if (alerts && alerts.length > 0) {
    lines.push('\n**Alertes actives** :');
    for (const a of alerts) {
      lines.push(`- [${a.severity.toUpperCase()}] ${a.title} — ${a.message}`);
    }
  }

  return lines.join('\n');
}

function fmtEur(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(1) + '%';
}

function fmtDelta(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const val = Number(n);
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}
