/**
 * trigger-mrs-sync — Triggers the GitHub Actions workflow for ma-rentree-scolaire.fr sync.
 *
 * Creates a crawl_jobs record for tracking, then dispatches the
 * "Sync MRS Catalog" workflow via the GitHub API.
 *
 * Required env:
 *   GITHUB_PAT          — GitHub Personal Access Token with actions:write scope
 *   GITHUB_REPO_OWNER   — GitHub repo owner (e.g. "Neo52000")
 *   GITHUB_REPO_NAME    — GitHub repo name (e.g. "ma-papeterie")
 */

import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "trigger-mrs-sync",
  auth: "admin",
  rateLimit: { prefix: "trigger-mrs-sync", max: 3, windowMs: 300_000 },
}, async ({ supabaseAdmin, corsHeaders, userId }) => {
  const githubPat = Deno.env.get("GITHUB_PAT");
  const repoOwner = Deno.env.get("GITHUB_REPO_OWNER");
  const repoName = Deno.env.get("GITHUB_REPO_NAME");

  if (!githubPat || !repoOwner || !repoName) {
    return jsonResponse(
      { error: "Configuration GitHub manquante. Contactez l'administrateur (GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME)." },
      500, corsHeaders,
    );
  }

  // Clean up zombie jobs stuck in "running" or "queued" for more than 45 minutes
  const zombieCutoff = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const { data: zombieJobs } = await supabaseAdmin
    .from("crawl_jobs")
    .update({ status: "error", last_error: "Job expiré (timeout après 45 min). Relancez le crawl." })
    .in("status", ["running", "queued"])
    .eq("source", "MRS_PUBLIC_PRODUCTS")
    .lt("updated_at", zombieCutoff)
    .select("id");
  if (zombieJobs?.length) {
    console.log(`trigger-mrs-sync: cleaned up ${zombieJobs.length} zombie job(s)`);
  }

  // Create crawl_jobs record for tracking
  const { data: job, error: jobError } = await supabaseAdmin
    .from("crawl_jobs")
    .insert({
      source: "MRS_PUBLIC_PRODUCTS",
      start_urls: ["https://ma-rentree-scolaire.fr/"],
      max_pages: 0,
      max_images: 99999,
      delay_ms: 300,
      status: "queued",
      phase: "discovery",
      created_by: userId,
    })
    .select()
    .single();

  if (jobError) {
    console.error("Error creating job:", jobError);
    return jsonResponse({ error: "Erreur lors de la création du job de suivi" }, 500, corsHeaders);
  }

  // Trigger GitHub Actions workflow_dispatch
  const workflowFile = "sync-mrs.yml";
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

    let userMessage = `Erreur GitHub API (${ghResp.status})`;
    if (ghResp.status === 401 || ghResp.status === 403) {
      userMessage = "Token GitHub invalide ou expiré. Vérifiez le secret GITHUB_PAT.";
    } else if (ghResp.status === 404) {
      userMessage = `Workflow ${workflowFile} introuvable. Vérifiez le dépôt ${repoOwner}/${repoName} et le token GitHub.`;
    } else if (ghResp.status === 422) {
      userMessage = `Paramètres invalides pour le workflow. Détails : ${errText.substring(0, 200)}`;
    }

    await supabaseAdmin
      .from("crawl_jobs")
      .update({ status: "error", last_error: userMessage })
      .eq("id", job.id);

    return { job_id: job.id, status: "error", detail: userMessage };
  }

  // Update job to running
  await supabaseAdmin
    .from("crawl_jobs")
    .update({ status: "running" })
    .eq("id", job.id);

  return { job_id: job.id, status: "running" };
}));
