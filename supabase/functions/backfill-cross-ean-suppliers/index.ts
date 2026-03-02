import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

/**
 * Rattrapage cross-EAN : pour chaque EAN partagé par plusieurs produits,
 * copie les supplier_products manquants vers tous les produits du même EAN.
 *
 * Exemple : si EAN 3130630136033 existe sur produit A et B,
 * et que seul A a un supplier_products ALKOR, on crée aussi l'entrée pour B.
 */

const BATCH_SIZE = 500;
const CHUNK_SIZE = 50;

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const stats = {
      dry_run: dryRun,
      eans_with_duplicates: 0,
      products_scanned: 0,
      supplier_products_created: 0,
      already_linked: 0,
      rollups_triggered: 0,
      errors: 0,
      warnings: [] as string[],
    };

    // ── 1. Trouver tous les EAN qui apparaissent sur 2+ produits ──
    // On fait un scan paginé des produits avec EAN, groupé côté JS
    const eanToProducts = new Map<string, string[]>(); // ean → product_id[]
    let offset = 0;

    while (true) {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, ean")
        .not("ean", "is", null)
        .order("ean")
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        stats.errors++;
        stats.warnings.push(`products fetch offset ${offset}: ${error.message}`);
        break;
      }
      if (!products || products.length === 0) break;

      for (const p of products) {
        if (!p.ean) continue;
        const ids = eanToProducts.get(p.ean) || [];
        ids.push(p.id);
        eanToProducts.set(p.ean, ids);
      }

      if (products.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    // Filtrer uniquement les EAN dupliqués
    const duplicateEans = new Map<string, string[]>();
    for (const [ean, ids] of eanToProducts) {
      if (ids.length >= 2) {
        duplicateEans.set(ean, ids);
      }
    }
    stats.eans_with_duplicates = duplicateEans.size;

    if (duplicateEans.size === 0) {
      return new Response(JSON.stringify({ ok: true, stats, message: "Aucun EAN dupliqué trouvé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Pour chaque groupe EAN, récupérer les supplier_products existants ──
    const allProductIds = new Set<string>();
    for (const ids of duplicateEans.values()) {
      for (const id of ids) allProductIds.add(id);
    }
    stats.products_scanned = allProductIds.size;

    // Charger tous les supplier_products pour ces produits
    const existingSpMap = new Map<string, Set<string>>(); // product_id → Set<supplier_id>
    const supplierData = new Map<string, { supplier_id: string; supplier_reference: string | null; supplier_price: number; source_type: string | null }>(); // "supplier_id::ean" → data

    const productIdArray = [...allProductIds];
    for (let i = 0; i < productIdArray.length; i += BATCH_SIZE) {
      const chunk = productIdArray.slice(i, i + BATCH_SIZE);
      const { data: spRows, error } = await supabase
        .from("supplier_products")
        .select("supplier_id, product_id, supplier_reference, supplier_price, source_type, stock_quantity")
        .in("product_id", chunk);

      if (error) {
        stats.errors++;
        stats.warnings.push(`supplier_products fetch: ${error.message}`);
        continue;
      }

      for (const sp of (spRows || [])) {
        // Track existing mappings
        const set = existingSpMap.get(sp.product_id) || new Set();
        set.add(sp.supplier_id);
        existingSpMap.set(sp.product_id, set);

        // Store supplier data by supplier_id (first one wins per supplier)
        const key = sp.supplier_id;
        if (!supplierData.has(key)) {
          supplierData.set(key, {
            supplier_id: sp.supplier_id,
            supplier_reference: sp.supplier_reference,
            supplier_price: sp.supplier_price ?? 0.01,
            source_type: sp.source_type,
          });
        }
      }
    }

    // ── 3. Créer les supplier_products manquants ──
    const toInsert: Record<string, unknown>[] = [];
    const touchedProductIds = new Set<string>();

    for (const [_ean, productIds] of duplicateEans) {
      // Collecter tous les supplier_ids liés à ce groupe EAN
      const allSuppliersForEan = new Set<string>();
      for (const pid of productIds) {
        const suppliers = existingSpMap.get(pid);
        if (suppliers) {
          for (const sid of suppliers) allSuppliersForEan.add(sid);
        }
      }

      // Pour chaque produit, créer les supplier_products manquants
      for (const pid of productIds) {
        const existing = existingSpMap.get(pid) || new Set();
        for (const sid of allSuppliersForEan) {
          if (existing.has(sid)) {
            stats.already_linked++;
            continue;
          }

          const data = supplierData.get(sid);
          if (!data) continue;

          toInsert.push({
            supplier_id: sid,
            product_id: pid,
            supplier_reference: data.supplier_reference,
            supplier_price: data.supplier_price,
            source_type: data.source_type,
            stock_quantity: 0,
            is_preferred: false,
            updated_at: new Date().toISOString(),
          });
          touchedProductIds.add(pid);

          // Mark as existing to avoid duplicates within this run
          existing.add(sid);
          existingSpMap.set(pid, existing);
        }
      }
    }

    stats.supplier_products_created = toInsert.length;

    // ── 4. Insérer en bulk ──
    if (toInsert.length > 0 && !dryRun) {
      for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        const { error: upsertErr } = await supabase
          .from("supplier_products")
          .upsert(chunk, { onConflict: "supplier_id,product_id" });

        if (upsertErr) {
          stats.errors += chunk.length;
          if (stats.warnings.length < 20) {
            stats.warnings.push(`upsert chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${upsertErr.message}`);
          }
        }
      }
    }

    // ── 5. Recompute rollups pour les produits touchés ──
    if (!dryRun && touchedProductIds.size > 0) {
      const pids = [...touchedProductIds];
      try {
        const { error: batchErr } = await supabase
          .rpc("recompute_product_rollups_batch", { p_product_ids: pids });
        if (batchErr) throw batchErr;
        stats.rollups_triggered = pids.length;
      } catch (_) {
        // Fallback: un par un
        for (const pid of pids) {
          try {
            await supabase.rpc("recompute_product_rollups", { p_product_id: pid });
            stats.rollups_triggered++;
          } catch (_e) {
            stats.errors++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
