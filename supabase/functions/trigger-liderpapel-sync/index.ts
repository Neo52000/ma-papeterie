import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";

const GITHUB_PAT = Deno.env.get("GITHUB_PAT") || "";
const REPO = "Neo52000/ma-papeterie";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);
  const headers = { "Content-Type": "application/json", ...corsHeaders };

  // Auth check — admin only
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  if (!GITHUB_PAT) {
    return new Response(JSON.stringify({ error: "GITHUB_PAT not configured" }), { status: 500, headers });
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
      return new Response(JSON.stringify({ ok: true, message: "Workflow dispatched" }), { headers });
    }

    const errText = await ghResp.text();
    return new Response(
      JSON.stringify({ error: `GitHub API ${ghResp.status}`, details: errText }),
      { status: ghResp.status, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers }
    );
  }
});
