// ── AI-CMO Recommendations — Edge Function ─────────────────────────────────
//
// Analyse les résultats de monitoring pour générer des recommandations
// concurrentielles automatiques via LLM.
//
// Déclenché via POST /ai-cmo-recommendations (admin ou cron)

import { createHandler } from "../_shared/handler.ts";
import { callAI } from "../_shared/ai-client.ts";
import { UserFacingError } from "../_shared/user-facing-error.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ────────────────────────────────────────────────────────────────────

interface Competitor {
  name: string;
  website: string | null;
  weight: number;
}

interface PromptRun {
  question_id: string;
  raw_response: string;
  brand_mentioned: boolean;
  top_domain: string | null;
  mentioned_pages: { url: string; title?: string }[];
  run_at: string;
  ai_cmo_questions: { prompt: string } | null;
}

interface Profile {
  description: string | null;
  website: string | null;
  name_aliases: string[];
  products: string | null;
}

interface RecommendationPayload {
  competitor_domain: string;
  prompts_to_analyze: string[];
  why_competitor: string;
  why_not_user: string;
  what_to_do: string;
  completed_at: string;
}

const LLM_MODEL = "gpt-4o-mini";
const MAX_RUNS_TO_ANALYZE = 200;

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(
  createHandler(
    {
      name: "ai-cmo-recommendations",
      auth: "admin-or-secret",
      methods: ["POST"],
      rateLimit: { prefix: "ai-cmo-reco", max: 3, windowMs: 300_000 },
    },
    async ({ supabaseAdmin }) => {
      if (!Deno.env.get("OPENAI_API_KEY")) {
        throw new UserFacingError(
          "OPENAI_API_KEY non configuré. Ajoutez le secret dans Supabase : " +
            "`supabase secrets set OPENAI_API_KEY=sk-...` (ou via le dashboard Supabase > Edge Functions > Secrets).",
          503,
        );
      }

      const profile = await loadProfile(supabaseAdmin);
      const competitors = await loadCompetitors(supabaseAdmin);
      const runs = await loadRecentRuns(supabaseAdmin);

      if (runs.length === 0) {
        return { success: true, message: "Aucun résultat de monitoring à analyser. Lancez d'abord un monitoring dans l'onglet principal.", recommendations: 0 };
      }

      // Group runs by top competitor domains
      const domainRuns = groupRunsByCompetitorDomains(runs, competitors, profile);

      if (domainRuns.size === 0) {
        return { success: true, message: "Aucun domaine concurrent détecté dans les résultats", recommendations: 0 };
      }

      console.log(`[ai-cmo-recommendations] Analyzing ${domainRuns.size} competitor domains`);

      const recommendations: RecommendationPayload[] = [];
      let totalTokensIn = 0;
      let totalTokensOut = 0;

      for (const [domain, domainData] of domainRuns) {
        try {
          const result = await generateRecommendation(domain, domainData, profile);
          recommendations.push(result.recommendation);
          totalTokensIn += result.tokensIn;
          totalTokensOut += result.tokensOut;
        } catch (err) {
          console.error(
            `[ai-cmo-recommendations] Error for ${domain}:`,
            err instanceof Error ? err.message : err,
          );
          // Propager immédiatement les erreurs de configuration.
          if (err instanceof UserFacingError) throw err;
        }
      }

      if (recommendations.length > 0) {
        await writeRecommendations(supabaseAdmin, recommendations);
      }

      await trackCosts(supabaseAdmin, totalTokensIn, totalTokensOut, recommendations.length);

      return {
        success: true,
        recommendations: recommendations.length,
        domains_analyzed: [...domainRuns.keys()],
      };
    },
  ),
);

// ── Load Data ────────────────────────────────────────────────────────────────

async function loadProfile(sb: SupabaseClient): Promise<Profile> {
  const { data } = await sb
    .from("ai_cmo_profiles")
    .select("description, website, name_aliases, products")
    .maybeSingle();

  return {
    description: data?.description ?? "Ma Papeterie - Fournitures de bureau et scolaires",
    website: data?.website ?? "ma-papeterie.fr",
    name_aliases: data?.name_aliases ?? ["Ma Papeterie", "ma-papeterie.fr"],
    products: data?.products ?? "fournitures scolaires, fournitures de bureau, papeterie",
  };
}

async function loadCompetitors(sb: SupabaseClient): Promise<Competitor[]> {
  const { data, error } = await sb
    .from("ai_cmo_competitors")
    .select("name, website, weight")
    .order("weight", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Competitor[];
}

async function loadRecentRuns(sb: SupabaseClient): Promise<PromptRun[]> {
  const { data, error } = await sb
    .from("ai_cmo_prompt_runs")
    .select("question_id, raw_response, brand_mentioned, top_domain, mentioned_pages, run_at, ai_cmo_questions(prompt)")
    .order("run_at", { ascending: false })
    .limit(MAX_RUNS_TO_ANALYZE);
  if (error) throw error;
  return (data ?? []) as PromptRun[];
}

// ── Group Runs by Competitor Domains ─────────────────────────────────────────

interface DomainData {
  competitorName: string;
  weight: number;
  runs: PromptRun[];
  mentionCount: number;
  brandMissedCount: number;
}

function groupRunsByCompetitorDomains(
  runs: PromptRun[],
  competitors: Competitor[],
  profile: Profile,
): Map<string, DomainData> {
  const competitorDomainMap = new Map<string, Competitor>();
  for (const c of competitors) {
    if (c.website) {
      try {
        const host = new URL(c.website).hostname.replace("www.", "");
        competitorDomainMap.set(host, c);
      } catch {
        const clean = c.website.replace(/^https?:\/\//, "").replace("www.", "").split("/")[0];
        if (clean) competitorDomainMap.set(clean, c);
      }
    }
  }

  const result = new Map<string, DomainData>();

  for (const run of runs) {
    const mentionedDomains = new Set<string>();

    if (run.top_domain) mentionedDomains.add(run.top_domain.replace("www.", ""));
    for (const page of (run.mentioned_pages ?? [])) {
      try {
        const host = new URL(page.url).hostname.replace("www.", "");
        mentionedDomains.add(host);
      } catch { /* skip */ }
    }

    for (const domain of mentionedDomains) {
      const competitor = competitorDomainMap.get(domain);
      if (!competitor) continue;

      if (!result.has(domain)) {
        result.set(domain, {
          competitorName: competitor.name,
          weight: competitor.weight,
          runs: [],
          mentionCount: 0,
          brandMissedCount: 0,
        });
      }

      const entry = result.get(domain)!;
      entry.runs.push(run);
      entry.mentionCount++;
      if (!run.brand_mentioned) entry.brandMissedCount++;
    }
  }

  // Keep top 10 by mention count, weighted
  const sorted = [...result.entries()]
    .sort((a, b) => (b[1].mentionCount * b[1].weight) - (a[1].mentionCount * a[1].weight))
    .slice(0, 10);

  return new Map(sorted);
}

// ── Generate Recommendation via LLM ──────────────────────────────────────────

async function generateRecommendation(
  domain: string,
  domainData: DomainData,
  profile: Profile,
): Promise<{ recommendation: RecommendationPayload; tokensIn: number; tokensOut: number }> {
  const samplePrompts = domainData.runs
    .filter((r) => r.ai_cmo_questions?.prompt)
    .map((r) => r.ai_cmo_questions!.prompt)
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, 5);

  const sampleResponses = domainData.runs
    .filter((r) => r.raw_response)
    .slice(0, 3)
    .map((r) => r.raw_response!.substring(0, 500));

  const systemPrompt = `Tu es un expert en stratégie de visibilité IA (AI Optimization / GEO). Tu analyses les réponses des IA conversationnelles pour comprendre pourquoi certains concurrents sont cités et pas notre marque.

Réponds en JSON avec exactement ces 3 champs :
{
  "why_competitor": "Explication concise (2-3 phrases) de pourquoi ce concurrent est cité par les IA",
  "why_not_user": "Explication concise (2-3 phrases) de pourquoi notre marque n'est pas citée à la place",
  "what_to_do": "Plan d'action concret en 3-5 points pour améliorer notre visibilité IA face à ce concurrent"
}`;

  const userPrompt = `Notre entreprise : ${profile.description}
Site web : ${profile.website}
Produits : ${profile.products}
Aliases : ${(profile.name_aliases ?? []).join(", ")}

Concurrent analysé : ${domainData.competitorName} (${domain})
Nombre de citations du concurrent : ${domainData.mentionCount}
Nombre de fois où notre marque est absente quand ce concurrent est cité : ${domainData.brandMissedCount}

Prompts de monitoring où ce concurrent apparaît :
${samplePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Extraits de réponses IA mentionnant ce concurrent :
${sampleResponses.map((r, i) => `--- Réponse ${i + 1} ---\n${r}`).join("\n\n")}

Analyse ce concurrent et génère tes recommandations en JSON.`;

  const response = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { model: LLM_MODEL, temperature: 0.4 },
  );

  const rawContent = response.choices?.[0]?.message?.content ?? "{}";
  const tokensIn = response.usage?.prompt_tokens ?? 0;
  const tokensOut = response.usage?.completion_tokens ?? 0;

  let parsed: { why_competitor?: string; why_not_user?: string; what_to_do?: string };
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    parsed = {
      why_competitor: rawContent,
      why_not_user: "",
      what_to_do: "",
    };
  }

  return {
    recommendation: {
      competitor_domain: domain,
      prompts_to_analyze: samplePrompts,
      why_competitor: parsed.why_competitor ?? "",
      why_not_user: parsed.why_not_user ?? "",
      what_to_do: parsed.what_to_do ?? "",
      completed_at: new Date().toISOString(),
    },
    tokensIn,
    tokensOut,
  };
}

// ── Write Recommendations ────────────────────────────────────────────────────

async function writeRecommendations(
  sb: SupabaseClient,
  recommendations: RecommendationPayload[],
) {
  for (const rec of recommendations) {
    const { data: existing } = await sb
      .from("ai_cmo_recommendations")
      .select("id")
      .eq("competitor_domain", rec.competitor_domain)
      .maybeSingle();

    if (existing) {
      await sb
        .from("ai_cmo_recommendations")
        .update(rec)
        .eq("id", existing.id);
    } else {
      await sb.from("ai_cmo_recommendations").insert(rec);
    }
  }
}

// ── Track Costs ──────────────────────────────────────────────────────────────

async function trackCosts(
  sb: SupabaseClient,
  tokensIn: number,
  tokensOut: number,
  callCount: number,
) {
  const costPerInputToken = 0.00000015;
  const costPerOutputToken = 0.0000006;
  const totalCost = tokensIn * costPerInputToken + tokensOut * costPerOutputToken;
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await sb
    .from("ai_cmo_llm_costs")
    .select("id, cost, call_count, tokens_in, tokens_out")
    .eq("model", LLM_MODEL)
    .eq("date", today)
    .eq("call_type", "recommendations")
    .maybeSingle();

  if (existing) {
    await sb
      .from("ai_cmo_llm_costs")
      .update({
        cost: (existing.cost ?? 0) + totalCost,
        call_count: (existing.call_count ?? 0) + callCount,
        tokens_in: (existing.tokens_in ?? 0) + tokensIn,
        tokens_out: (existing.tokens_out ?? 0) + tokensOut,
      })
      .eq("id", existing.id);
  } else {
    await sb.from("ai_cmo_llm_costs").insert({
      model: LLM_MODEL,
      call_type: "recommendations",
      date: today,
      cost: totalCost,
      call_count: callCount,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    });
  }
}
