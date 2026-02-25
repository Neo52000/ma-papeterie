import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Non autorisé: token manquant");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Non autorisé: token invalide");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      throw new Error("Non autorisé: rôle admin requis");
    }

    // ── Paramètres ──────────────────────────────────────────────────────────
    const { simulation_id } = await req.json();
    if (!simulation_id) throw new Error("simulation_id requis");

    // ── Charger la simulation ────────────────────────────────────────────────
    const { data: simulation, error: simError } = await supabase
      .from("pricing_simulations")
      .select("*")
      .eq("id", simulation_id)
      .single();

    if (simError || !simulation) throw new Error("Simulation introuvable");
    if (simulation.status !== "applied") {
      throw new Error(`Rollback impossible: simulation "${simulation.status}" (seules les simulations "applied" sont annulables)`);
    }

    // ── Charger les logs originaux (non-rollback) de cette simulation ────────
    const { data: logs, error: logsError } = await supabase
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

      const { error: updateError } = await supabase
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
      const { error: logError } = await supabase
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
          applied_by: user.id,
          is_rollback: true,
          rollback_of: log.id,
        });

      if (logError) {
        console.error(`Log rollback failed for product ${log.product_id}:`, logError);
      }

      rolledBackCount++;
    }

    // ── Marquer la simulation comme rolled_back ──────────────────────────────
    await supabase
      .from("pricing_simulations")
      .update({ status: "rolled_back" })
      .eq("id", simulation_id);

    console.log(`pricing-rollback: ${rolledBackCount}/${logs.length} prix restaurés`);

    return new Response(
      JSON.stringify({
        success: true,
        rolled_back_count: rolledBackCount,
        total: logs.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("pricing-rollback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
