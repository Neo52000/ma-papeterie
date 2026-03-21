import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "pricing-rollback",
  auth: "admin",
  rateLimit: { prefix: "pricing-rollback", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, userId }) => {
  const { simulation_id } = body as { simulation_id?: string };
  if (!simulation_id) throw new Error("simulation_id requis");

  // ── Charger la simulation ────────────────────────────────────────────────
  const { data: simulation, error: simError } = await supabaseAdmin
    .from("pricing_simulations")
    .select("*")
    .eq("id", simulation_id)
    .single();

  if (simError || !simulation) throw new Error("Simulation introuvable");
  if (simulation.status !== "applied") {
    throw new Error(`Rollback impossible: simulation "${simulation.status}" (seules les simulations "applied" sont annulables)`);
  }

  // ── Charger les logs originaux (non-rollback) de cette simulation ────────
  const { data: logs, error: logsError } = await supabaseAdmin
    .from("price_changes_log")
    .select("*")
    .eq("simulation_id", simulation_id)
    .eq("is_rollback", false);

  if (logsError) throw logsError;
  if (!logs || logs.length === 0) {
    throw new Error("Aucun log de changement trouvé pour cette simulation");
  }

  let rolledBackCount = 0;
  const errors: string[] = [];

  for (const log of logs) {
    // Restaurer l'ancien prix
    const oldPriceTtc = Math.round(Number(log.old_price_ht) * 1.2 * 100) / 100;

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        price_ht: log.old_price_ht,
        price_ttc: oldPriceTtc,
      })
      .eq("id", log.product_id);

    if (updateError) {
      errors.push(`Produit ${log.product_id}: ${updateError.message}`);
      continue;
    }

    // Écrire l'entrée de rollback dans le log immuable
    // (les champs sont inversés: on repart de new→old)
    const { error: logError } = await supabaseAdmin
      .from("price_changes_log")
      .insert({
        product_id: log.product_id,
        simulation_id,
        rule_type: log.rule_type,
        old_price_ht: log.new_price_ht,          // prix "après" devient le "avant"
        new_price_ht: log.old_price_ht,          // prix original restauré
        price_change_percent: log.price_change_percent != null
          ? -Number(log.price_change_percent)
          : null,
        old_margin_percent: log.new_margin_percent,
        new_margin_percent: log.old_margin_percent,
        reason: `Rollback — simulation ${simulation_id}`,
        applied_by: userId,
        is_rollback: true,
        rollback_of: log.id,
      });

    if (logError) {
      console.error(`Log rollback failed for product ${log.product_id}:`, logError);
    }

    rolledBackCount++;
  }

  // ── Marquer la simulation comme rolled_back ──────────────────────────────
  await supabaseAdmin
    .from("pricing_simulations")
    .update({ status: "rolled_back" })
    .eq("id", simulation_id);

  console.log(`pricing-rollback: ${rolledBackCount}/${logs.length} prix restaurés`);

  return {
    success: true,
    rolled_back_count: rolledBackCount,
    total: logs.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}));
