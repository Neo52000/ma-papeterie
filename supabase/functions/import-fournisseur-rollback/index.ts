import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "import-fournisseur-rollback",
  auth: "admin",
  rateLimit: { prefix: "import-fourn-rollback", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body }) => {
  const { job_id } = body as any;
  if (!job_id) throw new Error("job_id requis");

  // Vérifier que le job est dans un état rollbackable
  const { data: job, error: jobErr } = await (supabaseAdmin as any)
    .from("import_jobs").select("*").eq("id", job_id).single();
  if (jobErr || !job) throw new Error("Job introuvable");
  if (!["done", "error"].includes(job.status)) {
    throw new Error(`Rollback impossible sur un job en status "${job.status}"`);
  }

  // Charger les snapshots
  const { data: snapshots, error: snapErr } = await (supabaseAdmin as any)
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

      const { error: restoreErr } = await supabaseAdmin
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
  await (supabaseAdmin as any).from("import_job_rows")
    .update({ status: "rolled_back" })
    .eq("job_id", job_id)
    .eq("status", "applied");

  // Mettre à jour le job
  await (supabaseAdmin as any).from("import_jobs").update({
    status: "rolled_back",
    rolled_back_at: new Date().toISOString(),
  }).eq("id", job_id);

  return { ok: true, restored, errors, error_details: errorDetails };
}));
