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
    if (simulation.status !== "completed") {
      throw new Error(`Impossible d'appliquer: simulation déjà "${simulation.status}"`);
    }

    // ── Charger les items ────────────────────────────────────────────────────
    const { data: items, error: itemsError } = await supabase
      .from("pricing_simulation_items")
      .select("*")
      .eq("simulation_id", simulation_id);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) throw new Error("Aucun item dans la simulation");

    let appliedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      // Calculer price_ttc (TVA 20% standard papeterie)
      const newPriceTtc = Math.round(Number(item.new_price_ht) * 1.2 * 100) / 100;

      // Mettre à jour le prix produit
      const { error: updateError } = await supabase
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
      const { error: logError } = await supabase
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
    await supabase
      .from("pricing_simulations")
      .update({
        status: "applied",
        applied_by: user.id,
        applied_at: new Date().toISOString(),
      })
      .eq("id", simulation_id);

    console.log(`pricing-apply: ${appliedCount}/${items.length} produits mis à jour`);

    return new Response(
      JSON.stringify({
        success: true,
        applied_count: appliedCount,
        total: items.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("pricing-apply error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
