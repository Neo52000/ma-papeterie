import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) throw new Error("Non autorisé");

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      throw new Error("Accès refusé");
    }

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id requis");

    // Vérifier que le job est dans un état rollbackable
    const { data: job, error: jobErr } = await (supabase as any)
      .from("import_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) throw new Error("Job introuvable");
    if (!["done", "error"].includes(job.status)) {
      throw new Error(`Rollback impossible sur un job en status "${job.status}"`);
    }

    // Charger les snapshots
    const { data: snapshots, error: snapErr } = await (supabase as any)
      .from("import_snapshots")
      .select("product_id, snapshot")
      .eq("job_id", job_id);
    if (snapErr) throw snapErr;

    if (!snapshots || snapshots.length === 0) {
      throw new Error("Aucun snapshot disponible pour ce job (rien à restaurer)");
    }

    let restored = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const snap of snapshots) {
      try {
        // Restaurer le snapshot dans products
        // On supprime les champs techniques non-restaurables
        const { id, created_at, ...restorableData } = snap.snapshot as Record<string, unknown>;
        restorableData.updated_at = new Date().toISOString();

        const { error: restoreErr } = await supabase
          .from("products")
          .update(restorableData)
          .eq("id", snap.product_id);

        if (restoreErr) throw restoreErr;
        restored++;
      } catch (e) {
        errors++;
        errorDetails.push(`Produit ${snap.product_id}: ${String(e)}`);
      }
    }

    // Marquer les lignes appliquées comme rolled_back
    await (supabase as any).from("import_job_rows")
      .update({ status: "rolled_back" })
      .eq("job_id", job_id)
      .eq("status", "applied");

    // Mettre à jour le job
    await (supabase as any).from("import_jobs").update({
      status: "rolled_back",
      rolled_back_at: new Date().toISOString(),
    }).eq("id", job_id);

    return new Response(
      JSON.stringify({ ok: true, restored, errors, error_details: errorDetails }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
