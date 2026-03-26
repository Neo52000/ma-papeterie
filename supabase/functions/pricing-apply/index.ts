import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "pricing-apply",
  auth: "admin",
  rateLimit: { prefix: "pricing-apply", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, userId }) => {
  const { simulation_id } = body as any;
  if (!simulation_id) throw new Error("simulation_id requis");

  const user = { id: userId };

  // ── Charger la simulation ────────────────────────────────────────────────
  const { data: simulation, error: simError } = await supabaseAdmin
    .from("pricing_simulations")
    .select("*")
    .eq("id", simulation_id)
    .single();

  if (simError || !simulation) throw new Error("Simulation introuvable");
  if (simulation.status !== "completed") {
    throw new Error(`Impossible d'appliquer: simulation déjà "${simulation.status}"`);
  }

  // ── Charger les items ────────────────────────────────────────────────────
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("pricing_simulation_items")
    .select("*")
    .eq("simulation_id", simulation_id);

  if (itemsError) throw itemsError;
  if (!items || items.length === 0) throw new Error("Aucun item dans la simulation");

  // Marge minimum absolue (%) — règle gravée dans le marbre
  const MINIMUM_MARGIN_PERCENT = 10;

  // Charger les coûts pour vérification marge
  const productIds = items.map((i: any) => i.product_id);
  const { data: productsData } = await supabaseAdmin
    .from("products")
    .select("id, cost_price")
    .in("id", productIds);
  const costMap = new Map<string, number>();
  for (const p of productsData ?? []) {
    if (p.cost_price != null && p.cost_price > 0) costMap.set(p.id, Number(p.cost_price));
  }

  let appliedCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    // Vérifier la marge minimum avant application
    const cost = costMap.get(item.product_id);
    const newPriceHt = Number(item.new_price_ht);
    if (cost != null && cost > 0 && newPriceHt > 0) {
      const margin = ((newPriceHt - cost) / newPriceHt) * 100;
      if (margin < MINIMUM_MARGIN_PERCENT) {
        errors.push(`Produit ${item.product_id}: marge ${margin.toFixed(1)}% < ${MINIMUM_MARGIN_PERCENT}% — application bloquée`);
        continue;
      }
    }

    // Calculer price_ttc (TVA 20% standard papeterie)
    const newPriceTtc = Math.round(Number(item.new_price_ht) * 1.2 * 100) / 100;

    // Mettre à jour le prix produit
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        price_ht: item.new_price_ht,
        price_ttc: newPriceTtc,
      })
      .eq("id", item.product_id);

    if (updateError) {
      errors.push(`Produit ${item.product_id}: ${updateError.message}`);
      continue;
    }

    // Écrire dans le log immuable
    const { error: logError } = await supabaseAdmin
      .from("price_changes_log")
      .insert({
        product_id: item.product_id,
        simulation_id,
        rule_type: item.rule_type,
        old_price_ht: item.old_price_ht,
        new_price_ht: item.new_price_ht,
        price_change_percent: item.price_change_percent,
        old_margin_percent: item.old_margin_percent,
        new_margin_percent: item.new_margin_percent,
        reason: item.reason,
        applied_by: user.id,
        is_rollback: false,
      });

    if (logError) {
      console.error(`Log failed for product ${item.product_id}:`, logError);
      // On continue même si le log échoue (le prix est déjà mis à jour)
    }

    appliedCount++;
  }

  // ── Marquer la simulation comme appliquée ────────────────────────────────
  await supabaseAdmin
    .from("pricing_simulations")
    .update({
      status: "applied",
      applied_by: user.id,
      applied_at: new Date().toISOString(),
    })
    .eq("id", simulation_id);

  console.log(`pricing-apply: ${appliedCount}/${items.length} produits mis à jour`);

  return {
    success: true,
    applied_count: appliedCount,
    total: items.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}));
