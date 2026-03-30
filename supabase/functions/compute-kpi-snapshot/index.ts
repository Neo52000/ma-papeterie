// Edge Function : compute-kpi-snapshot
// Calcule et insère un snapshot KPI hebdomadaire à partir des vraies données.
// Appelable par cron (x-api-secret) ou depuis l'admin (JWT admin).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdminOrSecret } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  // Auth : admin JWT ou cron secret
  const authError = await requireAdminOrSecret(req, corsHeaders);
  if (authError) return authError;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Déterminer la semaine cible (par défaut : début de la semaine courante, lundi)
    let weekStart: string | undefined;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        weekStart = body.week_start;
      } catch {
        // pas de body ou JSON invalide — on utilise la semaine courante
      }
    }

    // Appeler la fonction SQL qui fait tout le travail
    const { error } = await supabase.rpc("compute_weekly_kpi_snapshot", {
      p_week_start: weekStart ?? null,
    });

    if (error) {
      console.error("Erreur compute_weekly_kpi_snapshot:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Retourner le snapshot mis à jour
    const { data: snapshot, error: fetchError } = await supabase
      .from("kpi_snapshots")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: true, message: "Snapshot calculé, mais erreur au fetch" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, snapshot }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Erreur inattendue:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
