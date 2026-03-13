/**
 * cancel-crawl — Cancels a running or queued crawl job.
 *
 * Sets the job status to "canceled" in the crawl_jobs table.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Rate limit: 10 per minute
  const rlKey = getRateLimitKey(req, "cancel-crawl");
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Admin auth
  const auth = await requireAdmin(req, corsHeaders);
  if (isAuthError(auth)) return auth.error;

  // Parse body
  let jobId: string;
  try {
    const body = await req.json();
    jobId = body.job_id;
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }

  if (!jobId) {
    return json({ error: "job_id requis" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from("crawl_jobs")
      .select("id, status, source")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return json({ error: "Job non trouvé" }, 404);
    }

    // Check cancellable state
    if (job.status !== "running" && job.status !== "queued") {
      return json(
        { error: `Ce job n'est pas annulable (statut actuel : ${job.status})` },
        409,
      );
    }

    // Update to canceled
    const { error: updateError } = await supabase
      .from("crawl_jobs")
      .update({
        status: "canceled",
        last_error: "Annulé par l'utilisateur",
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("cancel-crawl: update error:", updateError);
      return json({ error: "Erreur lors de l'annulation" }, 500);
    }

    console.log(
      `cancel-crawl: job ${jobId} (source=${job.source}) canceled by user ${auth.userId}`,
    );

    return json({ job_id: jobId, status: "canceled" });
  } catch (err) {
    console.error("cancel-crawl error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
