import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";

// ─── Adapter interface ──────────────────────────────────────────────────────
interface ImportResult {
  brands: number;
  models: number;
  consumables: number;
  links: number;
}

interface ConsumableDataAdapter {
  name: string;
  importAll(supabase: any): Promise<ImportResult>;
}

// ─── Bechlem Adapter (placeholder — adapt once docs received) ───────────────
const bechlemAdapter: ConsumableDataAdapter = {
  name: "bechlem",
  async importAll(_supabase: any): Promise<ImportResult> {
    // TODO: Implement once Bechlem license is active and FTP data schema is documented.
    // Expected flow:
    // 1. Connect to Bechlem FTP server
    // 2. Download CSV/XML data files
    // 3. Parse brands, models, consumables, and cross-selling links
    // 4. Upsert into Supabase tables
    //
    // Data structure (from Bechlem documentation):
    // - One linking table (printer_model_id <-> consumable_id)
    // - One master data view (brands, models, consumables)
    // - Daily delta updates via FTP
    throw new Error(
      "Bechlem adapter not yet configured. Please set up the FTP connection and license first."
    );
  },
};

// ─── DataWriter Adapter (placeholder — future API v12 integration) ──────────
const datawriterAdapter: ConsumableDataAdapter = {
  name: "datawriter",
  async importAll(_supabase: any): Promise<ImportResult> {
    // TODO: Implement once DataWriter API v12 contract is signed.
    // Expected flow:
    // 1. Authenticate with DataWriter API
    // 2. Fetch brands: GET /api/v12/brands
    // 3. Fetch models per brand: GET /api/v12/models?brand_id=X
    // 4. Fetch consumables per model: GET /api/v12/consumables?model_id=X
    // 5. Upsert into Supabase tables
    throw new Error(
      "DataWriter adapter not yet configured. Please set up the API contract first."
    );
  },
};

const adapters: Record<string, ConsumableDataAdapter> = {
  bechlem: bechlemAdapter,
  datawriter: datawriterAdapter,
};

// ─── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const cors = handleCorsPreFlight(req);
  if (cors) return cors;

  const corsHeaders = getCorsHeaders(req);

  // Require admin
  const auth = await requireAdmin(req, corsHeaders);
  if ("error" in auth) return auth.error;

  try {
    const { source = "bechlem" } = await req.json().catch(() => ({}));

    const adapter = adapters[source];
    if (!adapter) {
      return new Response(
        JSON.stringify({ error: `Unknown source: ${source}. Available: ${Object.keys(adapters).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Log start
    const { data: logEntry } = await supabase
      .from("consumable_import_logs")
      .insert({ source, status: "running" })
      .select("id")
      .single();

    const logId = logEntry?.id;

    try {
      const result = await adapter.importAll(supabase);

      // Log success
      if (logId) {
        await supabase
          .from("consumable_import_logs")
          .update({
            status: "success",
            brands_count: result.brands,
            models_count: result.models,
            consumables_count: result.consumables,
            links_count: result.links,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }

      return new Response(
        JSON.stringify({ success: true, source, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (importErr: any) {
      // Log error
      if (logId) {
        await supabase
          .from("consumable_import_logs")
          .update({
            status: "error",
            error_message: importErr.message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }

      return new Response(
        JSON.stringify({ error: importErr.message, source }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
