import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface AlkorPriceRow {
  ref_art?: string;        // Réf Art 6 — clé de matching
  purchase_price_ht?: string; // Prix achat HT
  pvp_ttc?: string;        // PVP TTC (prix conseillé)
  vat_rate?: string;       // TVA (taux %)
  eco_tax?: string;        // Éco-taxe générique
  d3e?: string;            // D3E
  cop?: string;            // COP
  sorecop?: string;        // Sorecop
  deee?: string;           // DEEE
}

Deno.serve(createHandler({
  name: "import-alkor-prices",
  auth: "admin",
  rateLimit: { prefix: "import-alkor-prices", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { rows, format } = body as { rows: AlkorPriceRow[]; format?: string };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return jsonResponse({ error: 'No rows provided' }, 400, corsHeaders);
  }

  const result = {
    updated: 0,
    skipped: 0,
    errors: 0,
    rollups_recomputed: 0,
    details: [] as string[],
  };

  const touchedProductIds = new Set<string>();

  // ── Batch ref lookup: single query instead of N individual SELECTs ──
  const allRefs = rows
    .map(r => r.ref_art?.trim())
    .filter((r): r is string => !!r && r.length > 0);
  const uniqueRefs = [...new Set(allRefs)];

  const offersByRef = new Map<string, { id: string; product_id: string }>();
  if (uniqueRefs.length > 0) {
    const REF_CHUNK = 500;
    for (let i = 0; i < uniqueRefs.length; i += REF_CHUNK) {
      const chunk = uniqueRefs.slice(i, i + REF_CHUNK);
      const { data: offers } = await supabaseAdmin
        .from('supplier_offers')
        .select('id, product_id, supplier_product_id')
        .eq('supplier', 'ALKOR')
        .in('supplier_product_id', chunk);
      for (const o of offers || []) {
        if (o.supplier_product_id) {
          offersByRef.set(o.supplier_product_id, { id: o.id, product_id: o.product_id });
        }
      }
    }
  }

  // ── Process rows ──
  for (const row of rows) {
    const ref = row.ref_art?.trim();
    if (!ref) { result.skipped++; continue; }

    const purchasePriceHt = row.purchase_price_ht ? parseFloat(row.purchase_price_ht.replace(',', '.')) : null;
    const pvpTtc = row.pvp_ttc ? parseFloat(row.pvp_ttc.replace(',', '.')) : null;
    const vatRate = row.vat_rate ? parseFloat(row.vat_rate.replace(',', '.').replace('%', '')) : null;

    // Build tax_breakdown from eco-contribution fields
    const taxBreakdown: Record<string, number> = {};
    const addTax = (key: string, val?: string) => {
      if (val) {
        const n = parseFloat(val.replace(',', '.'));
        if (!isNaN(n) && n > 0) taxBreakdown[key] = n;
      }
    };
    addTax('eco', row.eco_tax);
    addTax('d3e', row.d3e);
    addTax('cop', row.cop);
    addTax('sorecop', row.sorecop);
    addTax('deee', row.deee);

    if (purchasePriceHt === null && pvpTtc === null) {
      result.skipped++;
      continue;
    }

    try {
      // Use batch-loaded map instead of individual query
      const offer = offersByRef.get(ref);

      if (!offer) {
        result.skipped++;
        if (result.details.length < 20) {
          result.details.push(`REF ${ref}: Aucune offre ALKOR trouvée — ignoré`);
        }
        continue;
      }

      // Update the offer with price data
      const updatePayload: Record<string, any> = {
        last_seen_at: new Date().toISOString(),
      };
      if (purchasePriceHt !== null && !isNaN(purchasePriceHt)) updatePayload.purchase_price_ht = purchasePriceHt;
      if (pvpTtc !== null && !isNaN(pvpTtc)) updatePayload.pvp_ttc = pvpTtc;
      if (vatRate !== null && !isNaN(vatRate)) updatePayload.vat_rate = vatRate;
      if (Object.keys(taxBreakdown).length > 0) updatePayload.tax_breakdown = taxBreakdown;

      const { error: updateErr } = await supabaseAdmin
        .from('supplier_offers')
        .update(updatePayload)
        .eq('id', offer.id);

      if (updateErr) throw updateErr;

      touchedProductIds.add(offer.product_id);
      result.updated++;
    } catch (e: any) {
      result.errors++;
      if (result.details.length < 30) {
        result.details.push(`REF ${ref}: ${e.message}`);
      }
    }
  }

  // ── Batch rollup: single RPC call instead of N individual calls ──
  if (touchedProductIds.size > 0) {
    const ids = Array.from(touchedProductIds);
    try {
      const { data } = await supabaseAdmin.rpc('recompute_product_rollups_batch', {
        p_product_ids: ids,
      });
      result.rollups_recomputed = data?.processed || ids.length;
    } catch (_) {
      // Fallback: try individual calls in small chunks (legacy approach)
      const ROLLUP_CHUNK = 50;
      for (let i = 0; i < ids.length; i += ROLLUP_CHUNK) {
        const chunk = ids.slice(i, i + ROLLUP_CHUNK);
        await Promise.allSettled(
          chunk.map((pid) => supabaseAdmin.rpc('recompute_product_rollups', { p_product_id: pid }))
        );
        result.rollups_recomputed += chunk.length;
      }
    }
  }

  // Log the import
  try {
    await supabaseAdmin.from('supplier_import_logs').insert({
      format: format || 'alkor-prices',
      total_rows: rows.length,
      success_count: result.updated,
      error_count: result.errors,
      errors: result.details.slice(0, 50),
      imported_at: new Date().toISOString(),
    });
  } catch (_) { /* non-bloquant */ }

  return result;
}));
