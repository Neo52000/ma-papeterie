import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "nightly-rollup",
  auth: "secret",
  rateLimit: { prefix: "nightly-rollup", max: 2, windowMs: 60_000 },
}, async ({ supabaseAdmin }) => {
  const startedAt = Date.now();

  try {
    // Check if nightly rollup is enabled
    const { data: enabledSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "nightly_rollup_enabled")
      .maybeSingle();

    const isEnabled = enabledSetting?.value !== false && enabledSetting?.value !== "false";

    if (!isEnabled) {
      return { skipped: true, reason: "nightly_rollup_enabled = false" };
    }

    // Fetch ghost offer thresholds from app_settings
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "ghost_offer_threshold_alkor_days",
        "ghost_offer_threshold_comlandi_days",
        "ghost_offer_threshold_soft_days",
      ]);

    const settingMap: Record<string, number> = {};
    for (const s of settings || []) {
      settingMap[s.key] = Number(s.value ?? 3);
    }

    const alkorDays = settingMap["ghost_offer_threshold_alkor_days"] ?? 3;
    const comlandiDays = settingMap["ghost_offer_threshold_comlandi_days"] ?? 3;
    const softDays = settingMap["ghost_offer_threshold_soft_days"] ?? 8;

    // Step 1: Ghost offer cleanup per supplier
    const ghostCleanupResults: Record<string, number> = {};

    for (const [supplier, days] of Object.entries({ ALKOR: alkorDays, COMLANDI: comlandiDays, SOFT: softDays })) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabaseAdmin
        .from("supplier_offers")
        .update({ is_active: false })
        .eq("supplier", supplier)
        .eq("is_active", true)
        .lt("last_seen_at", cutoff);

      if (!error) {
        ghostCleanupResults[supplier] = count ?? 0;
      }
    }

    // Step 2: Full rollup recompute in batches
    let totalProcessed = 0;
    let totalErrors = 0;
    let offset = 0;
    const BATCH_SIZE = 500;

    while (true) {
      const { data: productBatch, error: fetchErr } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("is_active", true)
        .order("id")
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchErr || !productBatch || productBatch.length === 0) {
        break;
      }

      // Recompute rollups in parallel chunks of 50
      const CHUNK = 50;
      for (let i = 0; i < productBatch.length; i += CHUNK) {
        const chunk = productBatch.slice(i, i + CHUNK);
        const results = await Promise.allSettled(
          chunk.map((p) => supabaseAdmin.rpc("recompute_product_rollups", { p_product_id: p.id })),
        );
        for (const r of results) {
          if (r.status === "fulfilled") totalProcessed++;
          else totalErrors++;
        }
      }

      offset += BATCH_SIZE;
      if (productBatch.length < BATCH_SIZE) break;
    }

    const durationMs = Date.now() - startedAt;

    const resultPayload = {
      processed: totalProcessed,
      errors: totalErrors,
      ghost_cleanup: ghostCleanupResults,
      duration_ms: durationMs,
    };

    // Log to cron_job_logs
    try {
      await supabaseAdmin.from("cron_job_logs").insert({
        job_name: "nightly-rollup-recompute",
        status: totalErrors === 0 ? "success" : "partial",
        result: resultPayload,
        duration_ms: durationMs,
        executed_at: new Date().toISOString(),
      });
    } catch (_) { /* non-bloquant */ }

    return resultPayload;
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    try {
      await supabaseAdmin.from("cron_job_logs").insert({
        job_name: "nightly-rollup-recompute",
        status: "error",
        error_message: error.message,
        duration_ms: durationMs,
        executed_at: new Date().toISOString(),
      });
    } catch (_) { /* ignore */ }

    throw error;
  }
}));
