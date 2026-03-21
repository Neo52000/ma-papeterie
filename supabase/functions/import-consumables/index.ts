import { createHandler, jsonResponse } from "../_shared/handler.ts";

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
Deno.serve(createHandler({
  name: "import-consumables",
  auth: "admin",
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { source = "bechlem" } = (body as Record<string, any>) || {};

  const adapter = adapters[source];
  if (!adapter) {
    return jsonResponse(
      { error: `Unknown source: ${source}. Available: ${Object.keys(adapters).join(", ")}` },
      400,
      corsHeaders,
    );
  }

  // Log start
  const { data: logEntry } = await supabaseAdmin
    .from("consumable_import_logs")
    .insert({ source, status: "running" })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {
    const result = await adapter.importAll(supabaseAdmin);

    // Log success
    if (logId) {
      await supabaseAdmin
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

    return { success: true, source, ...result };
  } catch (importErr: any) {
    // Log error
    if (logId) {
      await supabaseAdmin
        .from("consumable_import_logs")
        .update({
          status: "error",
          error_message: importErr.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return jsonResponse(
      { error: importErr.message, source },
      500,
      corsHeaders,
    );
  }
}));
