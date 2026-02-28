import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";
import { requireAdmin } from "../_shared/auth.ts";

type SupplierEnum = "ALKOR" | "COMLANDI" | "SOFT";

const DEFAULT_SUPPLIERS: SupplierEnum[] = ["ALKOR", "COMLANDI", "SOFT"];
const MAX_WARNINGS = 50;
const BATCH_SIZE = 200;

interface WarningState {
  total: number;
  list: string[];
}

function pushWarning(state: WarningState, message: string) {
  state.total += 1;
  if (state.list.length < MAX_WARNINGS) {
    state.list.push(message);
  }
}

function normalizeSupplierEnum(value: unknown): SupplierEnum | null {
  const v = String(value || "").trim().toUpperCase();
  if (v === "ALKOR" || v === "COMLANDI" || v === "SOFT") return v;
  return null;
}

function resolveSupplierEnum(name: string): SupplierEnum | null {
  const n = name.toUpperCase();
  if (n.includes("ALKOR") || n.includes("BUROLIKE")) return "ALKOR";
  if (n.includes("COMLANDI") || n.includes("CS GROUP") || n.includes("LIDERPAPEL")) return "COMLANDI";
  if (n.includes("SOFT")) return "SOFT";
  return null;
}

type SupplierProductRow = {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_reference: string | null;
  supplier_price: number | null;
  stock_quantity: number | null;
  lead_time_days: number | null;
  min_order_quantity: number | null;
  updated_at: string | null;
};

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const authResult = await requireAdmin(req, corsHeaders);
  if ('error' in authResult) return authResult.error;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const requestedSuppliers = Array.isArray(body.suppliers)
      ? body.suppliers
        .map((v: unknown) => normalizeSupplierEnum(v))
        .filter(Boolean) as SupplierEnum[]
      : DEFAULT_SUPPLIERS;

    const targetSuppliers = requestedSuppliers.length > 0
      ? [...new Set(requestedSuppliers)]
      : DEFAULT_SUPPLIERS;

    const warningState: WarningState = { total: 0, list: [] };

    const stats = {
      dry_run: dryRun,
      suppliers: targetSuppliers,
      scanned: 0,
      upserted: 0,
      skipped: 0,
      errors: 0,
      rollup_products: 0,
      skipped_unmapped_supplier: 0,
    };

    const { data: suppliersRows, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("is_active", true);

    if (suppliersError) {
      throw suppliersError;
    }

    const supplierIdToEnum = new Map<string, SupplierEnum>();
    for (const row of (suppliersRows || [])) {
      const resolved = resolveSupplierEnum(row.name || "");
      if (!resolved) continue;
      if (!targetSuppliers.includes(resolved)) continue;
      supplierIdToEnum.set(row.id, resolved);
    }

    if (supplierIdToEnum.size === 0) {
      pushWarning(
        warningState,
        `Aucun fournisseur actif resolu pour: ${targetSuppliers.join(", ")}`,
      );
      return new Response(JSON.stringify({
        ok: true,
        stats,
        warnings_count: warningState.total,
        warnings: warningState.list,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supplierIds = [...supplierIdToEnum.keys()];
    const nowIso = new Date().toISOString();

    const touchedProductIds = new Set<string>();
    let offset = 0;

    while (true) {
      const { data: rows, error } = await supabase
        .from("supplier_products")
        .select("id, supplier_id, product_id, supplier_reference, supplier_price, stock_quantity, lead_time_days, min_order_quantity, updated_at")
        .in("supplier_id", supplierIds)
        .order("id")
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        stats.errors += 1;
        pushWarning(warningState, `supplier_products fetch offset ${offset}: ${error.message}`);
        break;
      }

      const batchRows = (rows || []) as SupplierProductRow[];
      if (batchRows.length === 0) break;
      offset += BATCH_SIZE;

      stats.scanned += batchRows.length;

      const offersPayload: Array<Record<string, unknown>> = [];
      for (const row of batchRows) {
        const supplier = supplierIdToEnum.get(row.supplier_id);
        if (!supplier) {
          stats.skipped += 1;
          stats.skipped_unmapped_supplier += 1;
          continue;
        }

        const supplierProductId = row.supplier_reference?.trim() || `${row.supplier_id}:${row.product_id}`;
        offersPayload.push({
          supplier,
          supplier_product_id: supplierProductId,
          product_id: row.product_id,
          purchase_price_ht: row.supplier_price,
          stock_qty: row.stock_quantity ?? 0,
          delivery_delay_days: row.lead_time_days ?? null,
          min_qty: row.min_order_quantity && row.min_order_quantity > 0 ? row.min_order_quantity : 1,
          is_active: true,
          last_seen_at: row.updated_at || nowIso,
        });
        touchedProductIds.add(row.product_id);
      }

      if (offersPayload.length === 0) continue;

      if (dryRun) {
        stats.upserted += offersPayload.length;
        continue;
      }

      for (let i = 0; i < offersPayload.length; i += 50) {
        const chunk = offersPayload.slice(i, i + 50);
        const { error: upsertError } = await supabase
          .from("supplier_offers")
          .upsert(chunk, { onConflict: "supplier,supplier_product_id", ignoreDuplicates: false });

        if (upsertError) {
          stats.errors += chunk.length;
          pushWarning(
            warningState,
            `supplier_offers upsert chunk ${Math.floor(i / 50) + 1}: ${upsertError.message}`,
          );
        } else {
          stats.upserted += chunk.length;
        }
      }
    }

    if (!dryRun && touchedProductIds.size > 0) {
      const productIds = [...touchedProductIds];
      const { error: batchRollupError } = await supabase
        .rpc("recompute_product_rollups_batch", { p_product_ids: productIds });

      if (batchRollupError) {
        pushWarning(
          warningState,
          `recompute_product_rollups_batch: ${batchRollupError.message}`,
        );
        for (const productId of productIds) {
          const { error: singleRollupError } = await supabase
            .rpc("recompute_product_rollups", { p_product_id: productId });
          if (singleRollupError) {
            stats.errors += 1;
            pushWarning(
              warningState,
              `recompute_product_rollups(${productId}): ${singleRollupError.message}`,
            );
          } else {
            stats.rollup_products += 1;
          }
        }
      } else {
        stats.rollup_products = productIds.length;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      stats,
      warnings_count: warningState.total,
      warnings: warningState.list,
    }), {
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
