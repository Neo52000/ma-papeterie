import { createHandler, jsonResponse } from "../_shared/handler.ts";

const GITHUB_PAT = Deno.env.get("GITHUB_PAT") || "";
const REPO = "Neo52000/ma-papeterie";

Deno.serve(createHandler({
  name: "trigger-liderpapel-sync",
  auth: "admin",
}, async ({ body, corsHeaders }) => {
  if (!GITHUB_PAT) {
    return jsonResponse({ error: "GITHUB_PAT not configured" }, 500, corsHeaders);
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const workflow = (b.workflow as string) || "sync-liderpapel-sftp.yml";
  const inputs: Record<string, string> = {};

  if (b.include_enrichment) inputs.include_enrichment = "true";
  if (b.test_only) inputs.test_only = "true";
  if (b.dry_run) inputs.dry_run = "true";

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
    },
  );

  if (ghResp.status === 204) {
    return { ok: true, message: "Workflow dispatched" };
  }

  const errText = await ghResp.text();
  return jsonResponse(
    { error: `GitHub API ${ghResp.status}`, details: errText },
    ghResp.status,
    corsHeaders,
  );
}));
