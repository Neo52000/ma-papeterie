import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

const ALLOWED_HOSTS: Record<string, string> = {
  MRS_PUBLIC: "img1.ma-rentree-scolaire.fr",
  ALKOR_B2B: "b2b.alkorshop.com",
};

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'start-crawl');
  if (!(await checkRateLimit(rlKey, 5, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "super_admin"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Accès réservé aux administrateurs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { source, start_urls, max_pages = 800, max_images = 3000, delay_ms = 150 } = await req.json();

    // Validate source
    if (!ALLOWED_HOSTS[source]) {
      return new Response(
        JSON.stringify({ error: `Source invalide: ${source}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate all URLs against allowlist
    const allowedHost = ALLOWED_HOSTS[source];
    for (const url of start_urls) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname !== allowedHost) {
          return new Response(
            JSON.stringify({ error: `URL non autorisée: ${url}. Seul ${allowedHost} est autorisé.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: `URL invalide: ${url}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from("crawl_jobs")
      .insert({
        source,
        start_urls,
        max_pages,
        max_images,
        delay_ms,
        status: "queued",
        created_by: user.id,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du job" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger run-crawl and wait for acknowledgement (fire-and-forget doesn't work on Edge Functions)
    const runCrawlUrl = `${supabaseUrl}/functions/v1/run-crawl`;
    console.log(`start-crawl: triggering run-crawl for job ${job.id}`);

    try {
      const apiCronSecret = Deno.env.get("API_CRON_SECRET") ?? "";
      const runResp = await fetch(runCrawlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          "x-api-secret": apiCronSecret,
        },
        body: JSON.stringify({ job_id: job.id }),
      });

      const runBody = await runResp.text();
      console.log(`start-crawl: run-crawl responded ${runResp.status}: ${runBody}`);

      if (!runResp.ok) {
        await supabase.from("crawl_jobs").update({
          status: "error",
          last_error: `Échec du déclenchement du crawl (HTTP ${runResp.status}): ${runBody}`,
        }).eq("id", job.id);

        return new Response(
          JSON.stringify({ job_id: job.id, status: "error", detail: runBody }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchErr) {
      console.error("start-crawl: failed to trigger run-crawl:", fetchErr);
      await supabase.from("crawl_jobs").update({
        status: "error",
        last_error: `Impossible de contacter run-crawl: ${fetchErr.message}`,
      }).eq("id", job.id);

      return new Response(
        JSON.stringify({ job_id: job.id, status: "error", detail: fetchErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ job_id: job.id, status: "queued" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("start-crawl error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
