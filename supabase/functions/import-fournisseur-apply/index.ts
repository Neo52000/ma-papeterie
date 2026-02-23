import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Validation d'une ligne mappée ─────────────────────────────────────────────
function validateRow(mapped: Record<string, string>): string[] {
  const errors: string[] = [];

  if (!mapped.name?.trim()) errors.push("Nom produit requis");

  if (mapped.ean?.trim()) {
    const ean = mapped.ean.trim().replace(/\s/g, "");
    if (!/^\d{8}$|^\d{13}$/.test(ean)) errors.push("EAN invalide (8 ou 13 chiffres)");
  }

  if (mapped.price_ht !== undefined && mapped.price_ht !== "") {
    const v = Number(mapped.price_ht);
    if (isNaN(v) || v <= 0) errors.push("Prix HT doit être > 0");
  }

  if (mapped.price_ttc !== undefined && mapped.price_ttc !== "") {
    const v = Number(mapped.price_ttc);
    if (isNaN(v) || v <= 0) errors.push("Prix TTC doit être > 0");
  }

  if (mapped.supplier_price !== undefined && mapped.supplier_price !== "") {
    const v = Number(mapped.supplier_price);
    if (isNaN(v) || v <= 0) errors.push("Prix fournisseur doit être > 0");
  }

  if (mapped.stock_quantity !== undefined && mapped.stock_quantity !== "") {
    const v = Number(mapped.stock_quantity);
    if (isNaN(v) || v < 0) errors.push("Stock doit être >= 0");
  }

  if (mapped.image_url?.trim()) {
    if (!/^https?:\/\/.+/.test(mapped.image_url.trim())) errors.push("URL image invalide (doit commencer par http)");
  }

  return errors;
}

// ── Champs numériques à convertir ─────────────────────────────────────────────
const NUM_FIELDS = ["price_ht", "price_ttc", "stock_quantity", "weight_kg", "tva_rate", "supplier_price"];

function buildProductData(mapped: Record<string, string>): Record<string, unknown> {
  const data: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const strFields = ["name", "description", "category", "brand", "ean", "sku_interne",
                     "manufacturer_ref", "image_url", "ref_softcarrier", "oem_ref"];

  for (const f of strFields) {
    if (mapped[f]?.trim()) data[f] = mapped[f].trim();
  }

  for (const f of NUM_FIELDS) {
    if (mapped[f] !== undefined && mapped[f] !== "") {
      const v = Number(mapped[f]);
      if (!isNaN(v)) data[f] = v;
    }
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) throw new Error("Non autorisé");

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      throw new Error("Accès refusé : rôle admin requis");
    }

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id requis");

    // Charger le job
    const { data: job, error: jobErr } = await (supabase as any)
      .from("import_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) throw new Error("Job introuvable");
    if (job.status !== "staging") throw new Error(`Job non applicable (status: ${job.status})`);

    // Passer en "applying"
    await (supabase as any).from("import_jobs")
      .update({ status: "applying" }).eq("id", job_id);

    // Charger toutes les lignes staging
    const { data: rows, error: rowsErr } = await (supabase as any)
      .from("import_job_rows")
      .select("id, row_index, mapped_data")
      .eq("job_id", job_id)
      .eq("status", "staging")
      .order("row_index");
    if (rowsErr) throw rowsErr;

    let ok_rows = 0;
    let error_rows = 0;
    const total_rows = (rows ?? []).length;

    for (const row of rows ?? []) {
      const mapped = (row.mapped_data ?? {}) as Record<string, string>;
      const errors = validateRow(mapped);

      if (errors.length > 0) {
        await (supabase as any).from("import_job_rows")
          .update({ status: "invalid", error_messages: errors })
          .eq("id", row.id);
        error_rows++;
        continue;
      }

      try {
        // ── Recherche produit existant ────────────────────────────────────────
        let productId: string | null = null;

        if (mapped.ean?.trim()) {
          const ean = mapped.ean.trim();
          const { data: existing } = await supabase
            .from("products").select("id").eq("ean", ean).maybeSingle();
          productId = existing?.id ?? null;
        }

        if (!productId && mapped.sku_interne?.trim()) {
          const { data: existing } = await supabase
            .from("products").select("id").eq("sku_interne", mapped.sku_interne.trim()).maybeSingle();
          productId = existing?.id ?? null;
        }

        if (!productId && mapped.manufacturer_ref?.trim()) {
          const { data: existing } = await supabase
            .from("products").select("id").eq("manufacturer_ref", mapped.manufacturer_ref.trim()).maybeSingle();
          productId = existing?.id ?? null;
        }

        // ── Snapshot avant modification ───────────────────────────────────────
        if (productId) {
          const { data: existingProd } = await supabase
            .from("products").select("*").eq("id", productId).single();
          if (existingProd) {
            await (supabase as any).from("import_snapshots").insert({
              job_id,
              product_id: productId,
              snapshot: existingProd,
            });
          }
        }

        // ── Upsert produit ────────────────────────────────────────────────────
        const productData = buildProductData(mapped);
        let finalProductId: string;

        if (productId) {
          const { error: updErr } = await supabase
            .from("products").update(productData).eq("id", productId);
          if (updErr) throw updErr;
          finalProductId = productId;
        } else {
          const { data: newProd, error: insErr } = await supabase
            .from("products")
            .insert({ ...productData, is_active: true, created_at: new Date().toISOString() })
            .select("id").single();
          if (insErr) throw insErr;
          finalProductId = newProd.id;
        }

        // ── Mise à jour supplier_products ─────────────────────────────────────
        if (job.supplier_id) {
          const spData: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (mapped.supplier_reference?.trim()) spData.supplier_reference = mapped.supplier_reference.trim();
          if (mapped.supplier_price !== undefined && mapped.supplier_price !== "") {
            const sp = Number(mapped.supplier_price);
            if (!isNaN(sp) && sp > 0) spData.supplier_price = sp;
          }
          if (mapped.stock_quantity !== undefined && mapped.stock_quantity !== "") {
            const sq = Number(mapped.stock_quantity);
            if (!isNaN(sq)) spData.stock_quantity = sq;
          }

          if (Object.keys(spData).length > 1) {
            // Try update first, then insert
            const { data: existing } = await supabase
              .from("supplier_products")
              .select("id")
              .eq("supplier_id", job.supplier_id)
              .eq("product_id", finalProductId)
              .maybeSingle();

            if (existing) {
              await supabase.from("supplier_products")
                .update(spData)
                .eq("supplier_id", job.supplier_id)
                .eq("product_id", finalProductId);
            } else {
              await supabase.from("supplier_products").insert({
                supplier_id: job.supplier_id,
                product_id: finalProductId,
                supplier_price: Number(mapped.supplier_price ?? 0),
                ...spData,
              });
            }
          }
        }

        // ── Marquer la ligne comme appliquée ──────────────────────────────────
        await (supabase as any).from("import_job_rows").update({
          status: "applied",
          product_id: finalProductId,
          error_messages: [],
        }).eq("id", row.id);

        ok_rows++;
      } catch (rowErr) {
        await (supabase as any).from("import_job_rows").update({
          status: "error",
          error_messages: [String(rowErr)],
        }).eq("id", row.id);
        error_rows++;
      }
    }

    // ── Finaliser le job ──────────────────────────────────────────────────────
    const finalStatus = error_rows === total_rows && total_rows > 0 ? "error" : "done";
    await (supabase as any).from("import_jobs").update({
      status: finalStatus,
      total_rows,
      ok_rows,
      error_rows,
      applied_at: new Date().toISOString(),
    }).eq("id", job_id);

    return new Response(
      JSON.stringify({ ok: true, total_rows, ok_rows, error_rows, status: finalStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
