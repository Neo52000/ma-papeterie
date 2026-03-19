import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GITHUB_PAT = Deno.env.get("GITHUB_PAT") || "";
const REPO = "Neo52000/ma-papeterie";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Auth check — only authenticated users
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (!GITHUB_PAT) {
    return new Response(JSON.stringify({ error: "GITHUB_PAT not configured" }), { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const workflow = body.workflow || "sync-liderpapel.yml";
    const inputs: Record<string, string> = {};

    if (body.include_enrichment) inputs.include_enrichment = "true";
    if (body.test_only) inputs.test_only = "true";
    if (body.dry_run) inputs.dry_run = "true";

    const ghResp = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_PAT}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main", inputs }),
      }
    );

    if (ghResp.status === 204) {
      return new Response(JSON.stringify({ ok: true, message: "Workflow dispatched" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const errText = await ghResp.text();
    return new Response(
      JSON.stringify({ error: `GitHub API ${ghResp.status}`, details: errText }),
      { status: ghResp.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
