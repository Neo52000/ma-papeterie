/**
 * cancel-crawl — Cancels a running or queued crawl job.
 *
 * Sets the job status to "canceled" in the crawl_jobs table.
 */

import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "cancel-crawl",
  auth: "admin",
  rateLimit: { prefix: "cancel-crawl", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, userId }) => {
  const { job_id: jobId } = body as any;

  if (!jobId) {
    return jsonResponse({ error: "job_id requis" }, 400, corsHeaders);
  }

  // Fetch the job
  const { data: job, error: jobError } = await supabaseAdmin
    .from("crawl_jobs")
    .select("id, status, source")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return jsonResponse({ error: "Job non trouvé" }, 404, corsHeaders);
  }

  // Check cancellable state
  if (job.status !== "running" && job.status !== "queued") {
    return jsonResponse(
      { error: `Ce job n'est pas annulable (statut actuel : ${job.status})` },
      409,
      corsHeaders,
    );
  }

  // Update to canceled
  const { error: updateError } = await supabaseAdmin
    .from("crawl_jobs")
    .update({
      status: "canceled",
      last_error: "Annulé par l'utilisateur",
    })
    .eq("id", jobId);

  if (updateError) {
    console.error("cancel-crawl: update error:", updateError);
    return jsonResponse({ error: "Erreur lors de l'annulation" }, 500, corsHeaders);
  }

  console.log(
    `cancel-crawl: job ${jobId} (source=${job.source}) canceled by user ${userId}`,
  );

  return { job_id: jobId, status: "canceled" };
}));
