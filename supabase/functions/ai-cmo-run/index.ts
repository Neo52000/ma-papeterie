// ── AI-CMO Run — Edge Function ──────────────────────────────────────────────
//
// Exécute les questions de monitoring AI-CMO actives contre OpenAI,
// analyse les réponses pour détecter les mentions de marque,
// et met à jour les statistiques du tableau de bord.
//
// Déclenché via :
//   - POST /ai-cmo-run (admin ou cron)
//   - pg_cron schedule quotidien
//
// Body optionnel : { "question_ids": ["uuid1", "uuid2"] }
//   Si vide, exécute toutes les questions actives prêtes (next_run_at <= now)

import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { callAI } from "../_shared/ai-client.ts";
import { UserFacingError } from "../_shared/user-facing-error.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  prompt: string;
  prompt_type: string;
  target_country: string | null;
  refresh_interval_seconds: number;
}

interface Profile {
  description: string | null;
  website: string | null;
  name_aliases: string[];
  products: string | null;
}

interface RunResult {
  question_id: string;
  llm_provider: string;
  llm_model: string;
  brand_mentioned: boolean;
  company_domain_rank: number | null;
  top_domain: string | null;
  raw_response: string;
  mentioned_pages: { url: string; title?: string }[];
  run_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LLM_PROVIDER = "openai";
const LLM_MODEL = "gpt-4o-mini";
const MAX_QUESTIONS_PER_RUN = 20;

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(
  createHandler(
    {
      name: "ai-cmo-run",
      auth: "admin-or-secret",
      methods: ["POST"],
      rateLimit: { prefix: "ai-cmo-run", max: 5, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body }) => {
      const input = (body ?? {}) as { question_ids?: string[] };

      // Pré-flight : OPENAI_API_KEY doit être configuré (échec immédiat plutôt
      // qu'après avoir chargé les données).
      if (!Deno.env.get("OPENAI_API_KEY")) {
        throw new UserFacingError(
          "OPENAI_API_KEY non configuré. Ajoutez le secret dans Supabase : " +
            "`supabase secrets set OPENAI_API_KEY=sk-...` (ou via le dashboard Supabase > Edge Functions > Secrets).",
          503,
        );
      }

      // 1. Load brand profile
      const profile = await loadProfile(supabaseAdmin);

      // 2. Load questions to run
      const questions = await loadQuestions(
        supabaseAdmin,
        input.question_ids,
      );

      if (questions.length === 0) {
        // Message distinct selon la cause racine pour aider l'utilisateur.
        const activeCount = await countActiveQuestions(supabaseAdmin);
        const message = activeCount === 0
          ? "Aucune question active. Ajoutez ou activez des questions dans l'onglet \"Questions\"."
          : "Aucune question à exécuter pour le moment (toutes planifiées pour plus tard). Cliquez à nouveau après l'échéance ou forcez via `question_ids`.";
        return { success: true, message, runs: 0, brand_mentions: 0 };
      }

      console.log(`[ai-cmo-run] Running ${questions.length} questions`);

      // 3. Run each question against LLM — ne planifier que les succès.
      const results: RunResult[] = [];
      const successfulQuestions: Question[] = [];
      const failures: { question_id: string; error: string }[] = [];
      let totalTokensIn = 0;
      let totalTokensOut = 0;

      for (const question of questions) {
        try {
          const result = await runQuestion(question, profile);
          results.push(result.run);
          successfulQuestions.push(question);
          totalTokensIn += result.tokensIn;
          totalTokensOut += result.tokensOut;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            `[ai-cmo-run] Error on question ${question.id}:`,
            message,
          );
          failures.push({ question_id: question.id, error: message });
          // Si une UserFacingError remonte (ex. clé API invalide en cours
          // d'exécution), on stoppe net et on la propage : inutile de brûler
          // des appels en série.
          if (err instanceof UserFacingError) throw err;
        }
      }

      // 4. Write results to database
      if (results.length > 0) {
        await writeResults(supabaseAdmin, results);
      }

      // 5. Update schedules UNIQUEMENT pour les questions ayant réussi
      // (les échecs seront retentés au prochain cycle).
      if (successfulQuestions.length > 0) {
        await updateSchedules(supabaseAdmin, successfulQuestions);
      }

      // 6. Recompute dashboard stats
      await recomputeDashboard(supabaseAdmin);

      // 7. Track LLM costs
      await trackCosts(supabaseAdmin, totalTokensIn, totalTokensOut, results.length);

      return {
        success: true,
        runs: results.length,
        brand_mentions: results.filter((r) => r.brand_mentioned).length,
        total_tokens: totalTokensIn + totalTokensOut,
        failures: failures.length,
        failure_details: failures.slice(0, 5),
      };
    },
  ),
);

// ── Load Profile ─────────────────────────────────────────────────────────────

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

async function countActiveQuestions(sb: SupabaseClient): Promise<number> {
  const { count } = await sb
    .from("ai_cmo_questions")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}

// ── Load Questions ───────────────────────────────────────────────────────────

async function loadQuestions(
  sb: SupabaseClient,
  questionIds?: string[],
): Promise<Question[]> {
  let query = sb
    .from("ai_cmo_questions")
    .select("id, prompt, prompt_type, target_country, refresh_interval_seconds")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(MAX_QUESTIONS_PER_RUN);

  if (questionIds && questionIds.length > 0) {
    query = query.in("id", questionIds);
  } else {
    // Only run questions that are due
    query = query.or(
      `next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Question[];
}

// ── Run a Single Question ────────────────────────────────────────────────────

async function runQuestion(
  question: Question,
  profile: Profile,
): Promise<{ run: RunResult; tokensIn: number; tokensOut: number }> {
  const brandNames = [
    ...(profile.name_aliases ?? []),
    profile.website ?? "ma-papeterie.fr",
  ].filter(Boolean);

  const systemPrompt = `You are a search simulation assistant. Answer the user's question as if you were a helpful AI assistant (like ChatGPT or Google Gemini).
Provide a natural, helpful response with specific recommendations, websites, and brands.
${question.target_country ? `Focus on results for: ${question.target_country}` : ""}
Include specific website URLs and domain names when recommending resources.
Be thorough and mention multiple options.`;

  const response = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: question.prompt },
    ],
    { model: LLM_MODEL, temperature: 0.7 },
  );

  const rawResponse = response.choices?.[0]?.message?.content ?? "";
  const tokensIn = response.usage?.prompt_tokens ?? 0;
  const tokensOut = response.usage?.completion_tokens ?? 0;

  // Analyze the response
  const analysis = analyzeResponse(rawResponse, brandNames);

  return {
    run: {
      question_id: question.id,
      llm_provider: LLM_PROVIDER,
      llm_model: LLM_MODEL,
      brand_mentioned: analysis.brandMentioned,
      company_domain_rank: analysis.domainRank,
      top_domain: analysis.topDomain,
      raw_response: rawResponse,
      mentioned_pages: analysis.mentionedPages,
      run_at: new Date().toISOString(),
    },
    tokensIn,
    tokensOut,
  };
}

// ── Analyze LLM Response ─────────────────────────────────────────────────────

interface AnalysisResult {
  brandMentioned: boolean;
  domainRank: number | null;
  topDomain: string | null;
  mentionedPages: { url: string; title?: string }[];
}

function analyzeResponse(
  response: string,
  brandNames: string[],
): AnalysisResult {
  const responseLower = response.toLowerCase();

  // Check if brand is mentioned
  const brandMentioned = brandNames.some((name) =>
    responseLower.includes(name.toLowerCase()),
  );

  // Extract URLs and domains
  const urlRegex = /https?:\/\/[^\s),\]]+/g;
  const domainRegex = /(?:[\w-]+\.)+(?:com|fr|org|net|eu|io|co|be|ch|de|uk|ca)(?:\/\S*)?/g;

  const urls = response.match(urlRegex) ?? [];
  const domainMatches = response.match(domainRegex) ?? [];

  // Build list of unique domains in order of appearance
  const seenDomains = new Set<string>();
  const orderedDomains: string[] = [];

  for (const match of [...urls, ...domainMatches]) {
    try {
      const hostname = match.includes("://")
        ? new URL(match).hostname.replace("www.", "")
        : match.split("/")[0].replace("www.", "");
      if (!seenDomains.has(hostname)) {
        seenDomains.add(hostname);
        orderedDomains.push(hostname);
      }
    } catch {
      // skip invalid URLs
    }
  }

  // Find our brand rank among mentioned domains
  let domainRank: number | null = null;
  for (let i = 0; i < orderedDomains.length; i++) {
    const d = orderedDomains[i].toLowerCase();
    if (
      brandNames.some(
        (name) =>
          d.includes(name.toLowerCase().replace(/\s+/g, "")) ||
          d.includes(name.toLowerCase().replace(/\s+/g, "-")),
      )
    ) {
      domainRank = i + 1;
      break;
    }
  }

  // Build mentioned pages
  const mentionedPages = urls.slice(0, 10).map((url) => ({
    url: url.replace(/[.,;)\]]+$/, ""), // clean trailing punctuation
  }));

  return {
    brandMentioned,
    domainRank,
    topDomain: orderedDomains[0] ?? null,
    mentionedPages,
  };
}

// ── Write Results ────────────────────────────────────────────────────────────

async function writeResults(sb: SupabaseClient, results: RunResult[]) {
  const { error } = await sb.from("ai_cmo_prompt_runs").insert(results);
  if (error) {
    console.error("[ai-cmo-run] Error writing results:", error.message);
    throw error;
  }
}

// ── Update Schedules ─────────────────────────────────────────────────────────

async function updateSchedules(sb: SupabaseClient, questions: Question[]) {
  const now = new Date();

  for (const q of questions) {
    const nextRun = new Date(
      now.getTime() + q.refresh_interval_seconds * 1000,
    );
    await sb
      .from("ai_cmo_questions")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRun.toISOString(),
      })
      .eq("id", q.id);
  }
}

// ── Recompute Dashboard Stats ────────────────────────────────────────────────

async function recomputeDashboard(sb: SupabaseClient) {
  // Get all runs
  const { data: runs, error } = await sb
    .from("ai_cmo_prompt_runs")
    .select("brand_mentioned, top_domain, mentioned_pages")
    .order("run_at", { ascending: false })
    .limit(500);

  if (error || !runs || runs.length === 0) return;

  // Load competitors for weighted SoV and domain type labeling
  const { data: competitors } = await sb
    .from("ai_cmo_competitors")
    .select("name, website, weight");

  const competitorDomainWeights = new Map<string, { name: string; weight: number }>();
  for (const c of (competitors ?? [])) {
    if (c.website) {
      try {
        const host = c.website.includes("://")
          ? new URL(c.website).hostname.replace("www.", "")
          : c.website.replace(/^https?:\/\//, "").replace("www.", "").split("/")[0];
        competitorDomainWeights.set(host, { name: c.name, weight: c.weight ?? 1 });
      } catch { /* skip */ }
    }
  }

  const totalRuns = runs.length;
  const brandMentions = runs.filter((r: any) => r.brand_mentioned).length;

  // AI Visibility Score = % of runs where brand was mentioned
  const aiVisibilityScore = (brandMentions / totalRuns) * 100;

  // Website Citation = % of runs where our domain appears in mentioned_pages
  const websiteCitations = runs.filter((r: any) => {
    const pages = r.mentioned_pages ?? [];
    return pages.some(
      (p: any) =>
        p.url?.toLowerCase().includes("ma-papeterie") ||
        p.url?.toLowerCase().includes("mapapeterie"),
    );
  }).length;
  const websiteCitationShare = (websiteCitations / totalRuns) * 100;

  // Share of Voice — count domain appearances with competitor weight boost
  const domainCounts: Record<string, number> = {};
  const domainRawCounts: Record<string, number> = {};
  for (const run of runs) {
    const domain = (run as any).top_domain;
    if (domain) {
      const clean = domain.replace("www.", "");
      const weight = competitorDomainWeights.get(clean)?.weight ?? 1;
      domainCounts[clean] = (domainCounts[clean] ?? 0) + weight;
      domainRawCounts[clean] = (domainRawCounts[clean] ?? 0) + 1;
    }
    for (const page of ((run as any).mentioned_pages ?? [])) {
      try {
        const host = new URL(page.url).hostname.replace("www.", "");
        const weight = competitorDomainWeights.get(host)?.weight ?? 1;
        domainCounts[host] = (domainCounts[host] ?? 0) + weight;
        domainRawCounts[host] = (domainRawCounts[host] ?? 0) + 1;
      } catch { /* skip */ }
    }
  }

  const totalWeightedMentions = Object.values(domainCounts).reduce(
    (a, b) => a + b,
    0,
  );

  const getDomainType = (domain: string): string => {
    const clean = domain.replace("www.", "");
    if (clean.includes("ma-papeterie") || clean.includes("mapapeterie")) return "you";
    if (competitorDomainWeights.has(clean)) return "competitor";
    return "other";
  };

  const shareOfVoice = Object.entries(domainCounts)
    .map(([domain, weightedCount]) => ({
      domain,
      count: domainRawCounts[domain] ?? 0,
      percentage:
        totalWeightedMentions > 0 ? (weightedCount / totalWeightedMentions) * 100 : 0,
      type: getDomainType(domain),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 20);

  // Upsert dashboard stats (single row)
  const { data: existing } = await sb
    .from("ai_cmo_dashboard_stats")
    .select("id")
    .maybeSingle();

  const statsPayload = {
    ai_visibility_score: aiVisibilityScore,
    website_citation_share: websiteCitationShare,
    total_runs: totalRuns,
    share_of_voice: shareOfVoice,
    computed_at: new Date().toISOString(),
  };

  if (existing) {
    await sb
      .from("ai_cmo_dashboard_stats")
      .update(statsPayload)
      .eq("id", existing.id);
  } else {
    await sb.from("ai_cmo_dashboard_stats").insert(statsPayload);
  }
}

// ── Track Costs ──────────────────────────────────────────────────────────────

async function trackCosts(
  sb: SupabaseClient,
  tokensIn: number,
  tokensOut: number,
  callCount: number,
) {
  // GPT-4o-mini pricing (approx)
  const costPerInputToken = 0.00000015; // $0.15 / 1M tokens
  const costPerOutputToken = 0.0000006; // $0.60 / 1M tokens
  const totalCost =
    tokensIn * costPerInputToken + tokensOut * costPerOutputToken;

  const today = new Date().toISOString().split("T")[0];

  // Try to update existing row for today
  const { data: existing } = await sb
    .from("ai_cmo_llm_costs")
    .select("id, cost, call_count, tokens_in, tokens_out")
    .eq("model", LLM_MODEL)
    .eq("date", today)
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
      call_type: "monitoring",
      date: today,
      cost: totalCost,
      call_count: callCount,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    });
  }
}
