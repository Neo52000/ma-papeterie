/**
 * trigger-alkor-sync — Triggers the GitHub Actions workflow for Alkor B2B sync.
 *
 * Creates a crawl_jobs record for tracking, then dispatches the
 * "Sync Alkor Catalog" workflow via the GitHub API.
 *
 * Required env:
 *   GITHUB_PAT          — GitHub Personal Access Token with actions:write scope
 *   GITHUB_REPO_OWNER   — GitHub repo owner (e.g. "Neo52000")
 *   GITHUB_REPO_NAME    — GitHub repo name (e.g. "ma-papeterie")
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Rate limit: 3 per 5 minutes
  const rlKey = getRateLimitKey(req, "trigger-alkor-sync");
  if (!(await checkRateLimit(rlKey, 3, 300_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Admin auth
  const auth = await requireAdmin(req, corsHeaders);
  if (isAuthError(auth)) return auth.error;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const githubPat = Deno.env.get("GITHUB_PAT");
  const repoOwner = Deno.env.get("GITHUB_REPO_OWNER");
  const repoName = Deno.env.get("GITHUB_REPO_NAME");

  if (!githubPat || !repoOwner || !repoName) {
    return json(
      { error: "Configuration GitHub manquante. Contactez l'administrateur (GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME)." },
      500,
    );
  }

  try {
    // Create crawl_jobs record for tracking
    const { data: job, error: jobError } = await supabase
      .from("crawl_jobs")
      .insert({
        source: "ALKOR_B2B",
        start_urls: ["https://b2b.alkorshop.com/"],
        max_pages: 9999,
        max_images: 99999,
        delay_ms: 500,
        status: "queued",
        created_by: auth.userId,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
      return json({ error: "Erreur lors de la création du job de suivi" }, 500);
    }

    // Trigger GitHub Actions workflow_dispatch
    const workflowFile = "sync-alkor.yml";
    const dispatchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFile}/dispatches`;

    const ghResp = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${githubPat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          crawl_job_id: job.id,
          upload_images: "true",
        },
      }),
    });

    if (!ghResp.ok) {
      const errText = await ghResp.text();
      console.error(`GitHub dispatch failed (${ghResp.status}):`, errText);

      await supabase
        .from("crawl_jobs")
        .update({ status: "error", last_error: `GitHub API error (${ghResp.status}): ${errText}` })
        .eq("id", job.id);

      return json({
        job_id: job.id,
        status: "error",
        detail: `Impossible de déclencher le workflow GitHub (${ghResp.status})`,
      });
    }

    // Update job to running
    await supabase
      .from("crawl_jobs")
      .update({ status: "running" })
      .eq("id", job.id);

    return json({ job_id: job.id, status: "running" });
  } catch (err) {
    console.error("trigger-alkor-sync error:", err);
    return json({ error: err.message }, 500);
  }
});
