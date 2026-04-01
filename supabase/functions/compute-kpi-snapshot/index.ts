// Edge Function : compute-kpi-snapshot
// Calcule et insère un snapshot KPI hebdomadaire à partir des vraies données.
// Appelable par cron (x-api-secret) ou depuis l'admin (JWT admin).

import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "compute-kpi-snapshot",
  auth: "admin-or-secret",
  methods: ["POST", "GET"],
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  // Déterminer la semaine cible (par défaut : début de la semaine courante, lundi)
  const weekStart = (body as { week_start?: string } | null)?.week_start ?? null;

  // Appeler la fonction SQL qui fait tout le travail
  const { error } = await supabaseAdmin.rpc("compute_weekly_kpi_snapshot", {
    p_week_start: weekStart,
  });

  if (error) {
    console.error("Erreur compute_weekly_kpi_snapshot:", error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }

  // Retourner le snapshot mis à jour
  const { data: snapshot, error: fetchError } = await supabaseAdmin
    .from("kpi_snapshots")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  if (fetchError) {
    return { success: true, message: "Snapshot calculé, mais erreur au fetch" };
  }

  return { success: true, snapshot };
}));
