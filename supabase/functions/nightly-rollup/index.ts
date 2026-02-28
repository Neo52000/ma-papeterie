import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";
import { requireApiSecret } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const secretError = requireApiSecret(req, corsHeaders);
  if (secretError) return secretError;

  const startedAt = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if nightly rollup is enabled
    const { data: enabledSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'nightly_rollup_enabled')
      .maybeSingle();

    const isEnabled = enabledSetting?.value !== false && enabledSetting?.value !== 'false';

    if (!isEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'nightly_rollup_enabled = false' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch ghost offer thresholds from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'ghost_offer_threshold_alkor_days',
        'ghost_offer_threshold_comlandi_days',
        'ghost_offer_threshold_soft_days',
      ]);

    const settingMap: Record<string, number> = {};
    for (const s of settings || []) {
      settingMap[s.key] = Number(s.value ?? 3);
    }

    const alkorDays = settingMap['ghost_offer_threshold_alkor_days'] ?? 3;
    const comlandiDays = settingMap['ghost_offer_threshold_comlandi_days'] ?? 3;
    const softDays = settingMap['ghost_offer_threshold_soft_days'] ?? 8;

    // Step 1: Ghost offer cleanup per supplier
    const ghostCleanupResults: Record<string, number> = {};

    for (const [supplier, days] of Object.entries({ ALKOR: alkorDays, COMLANDI: comlandiDays, SOFT: softDays })) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('supplier_offers')
        .update({ is_active: false })
        .eq('supplier', supplier)
        .eq('is_active', true)
        .lt('last_seen_at', cutoff);

      if (!error) {
        ghostCleanupResults[supplier] = count ?? 0;
      }
    }

    // Step 2: Full rollup recompute in batches
    let totalProcessed = 0;
    let totalErrors = 0;
    let offset = 0;
    const BATCH_SIZE = 500;
    let done = false;

    // Get a service-role auth bypass — use internal RPC that doesn't check auth
    // We use recompute_product_rollups directly since we have service role
    const { count: totalProducts } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    const total = totalProducts ?? 0;

    while (!done && offset < total + BATCH_SIZE) {
      // Fetch batch of product IDs
      const { data: productBatch, error: fetchErr } = await supabase
        .from('products')
        .select('id')
        .eq('is_active', true)
        .order('id')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchErr || !productBatch || productBatch.length === 0) {
        done = true;
        break;
      }

      // Recompute rollups in parallel chunks of 50
      const CHUNK = 50;
      for (let i = 0; i < productBatch.length; i += CHUNK) {
        const chunk = productBatch.slice(i, i + CHUNK);
        const results = await Promise.allSettled(
          chunk.map((p) => supabase.rpc('recompute_product_rollups', { p_product_id: p.id }))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') totalProcessed++;
          else totalErrors++;
        }
      }

      offset += BATCH_SIZE;
      if (productBatch.length < BATCH_SIZE) done = true;
    }

    const durationMs = Date.now() - startedAt;

    const resultPayload = {
      processed: totalProcessed,
      errors: totalErrors,
      total,
      ghost_cleanup: ghostCleanupResults,
      duration_ms: durationMs,
    };

    // Log to cron_job_logs
    try {
      await supabase.from('cron_job_logs').insert({
        job_name: 'nightly-rollup-recompute',
        status: totalErrors === 0 ? 'success' : 'partial',
        result: resultPayload,
        duration_ms: durationMs,
        executed_at: new Date().toISOString(),
      });
    } catch (_) { /* non-bloquant */ }

    return new Response(JSON.stringify(resultPayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await supabase.from('cron_job_logs').insert({
        job_name: 'nightly-rollup-recompute',
        status: 'error',
        error_message: error.message,
        duration_ms: durationMs,
        executed_at: new Date().toISOString(),
      });
    } catch (_) { /* ignore */ }

    return safeErrorResponse(error, corsHeaders, { status: 500, context: "nightly-rollup" });
  }
});
