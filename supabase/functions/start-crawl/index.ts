import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_HOSTS: Record<string, string> = {
  MRS_PUBLIC: "img1.ma-rentree-scolaire.fr",
  ALKOR_B2B: "b2b.alkorshop.com",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Fire-and-forget: trigger run-crawl
    const runCrawlUrl = `${supabaseUrl}/functions/v1/run-crawl`;
    fetch(runCrawlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch((err) => console.error("Failed to trigger run-crawl:", err));

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
