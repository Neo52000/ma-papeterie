import { createHandler, jsonResponse } from "../_shared/handler.ts";

const ALLOWED_HOSTS: Record<string, string> = {
  MRS_PUBLIC: "img1.ma-rentree-scolaire.fr",
  MRS_PUBLIC_PRODUCTS: "ma-rentree-scolaire.fr",
  ALKOR_B2B: "b2b.alkorshop.com",
};

Deno.serve(createHandler({
  name: "start-crawl",
  auth: "admin",
  rateLimit: { prefix: "start-crawl", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, userId }) => {
  const { source, start_urls, max_pages = 800, max_images = 3000, delay_ms = 150, enrich } = body as any;

  // Validate enrich options
  const VALID_ENRICH = ['images', 'descriptions', 'specs', 'dimensions'];
  const enrichOptions: string[] = Array.isArray(enrich)
    ? enrich.filter((e: string) => VALID_ENRICH.includes(e))
    : VALID_ENRICH;

  // Validate source
  if (!ALLOWED_HOSTS[source]) {
    return jsonResponse({ error: `Source invalide: ${source}` }, 400, corsHeaders);
  }

  // Validate all URLs against allowlist
  const allowedHost = ALLOWED_HOSTS[source];
  for (const url of start_urls) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== allowedHost) {
        return jsonResponse(
          { error: `URL non autorisée: ${url}. Seul ${allowedHost} est autorisé.` },
          400, corsHeaders,
        );
      }
    } catch {
      return jsonResponse({ error: `URL invalide: ${url}` }, 400, corsHeaders);
    }
  }

  // Create job
  const { data: job, error: jobError } = await supabaseAdmin
    .from("crawl_jobs")
    .insert({
      source,
      start_urls,
      max_pages,
      max_images,
      delay_ms,
      enrich_options: enrichOptions,
      status: "queued",
      created_by: userId,
    })
    .select()
    .single();

  if (jobError) {
    console.error("Error creating job:", jobError);
    return jsonResponse({ error: "Erreur lors de la création du job" }, 500, corsHeaders);
  }

  // Trigger run-crawl and wait for acknowledgement
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
      await supabaseAdmin.from("crawl_jobs").update({
        status: "error",
        last_error: `Échec du déclenchement du crawl (HTTP ${runResp.status}): ${runBody}`,
      }).eq("id", job.id);

      return { job_id: job.id, status: "error", detail: runBody };
    }
  } catch (fetchErr: any) {
    console.error("start-crawl: failed to trigger run-crawl:", fetchErr);
    await supabaseAdmin.from("crawl_jobs").update({
      status: "error",
      last_error: `Impossible de contacter run-crawl: ${fetchErr.message}`,
    }).eq("id", job.id);

    return { job_id: job.id, status: "error", detail: fetchErr.message };
  }

  return { job_id: job.id, status: "queued" };
}));
