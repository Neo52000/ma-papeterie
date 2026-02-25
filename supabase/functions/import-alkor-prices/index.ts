import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

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

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { rows } = await req.json() as { rows: AlkorPriceRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No rows provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = {
      updated: 0,
      skipped: 0,
      errors: 0,
      rollups_recomputed: 0,
      details: [] as string[],
    };

    const touchedProductIds = new Set<string>();
    const BATCH = 100;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);

      for (const row of batch) {
        const ref = row.ref_art?.trim();
        if (!ref) { result.skipped++; continue; }

        const purchasePriceHt = row.purchase_price_ht ? parseFloat(row.purchase_price_ht.replace(',', '.')) : null;
        const pvpTtc = row.pvp_ttc ? parseFloat(row.pvp_ttc.replace(',', '.')) : null;
        const vatRate = row.vat_rate ? parseFloat(row.vat_rate.replace(',', '.').replace('%', '')) : 20;

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
          // Find matching supplier_offer for ALKOR with this ref
          const { data: offer, error: findErr } = await supabase
            .from('supplier_offers')
            .select('id, product_id')
            .eq('supplier', 'ALKOR')
            .eq('supplier_product_id', ref)
            .maybeSingle();

          if (findErr) throw findErr;

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
          if (!isNaN(vatRate)) updatePayload.vat_rate = vatRate;
          if (Object.keys(taxBreakdown).length > 0) updatePayload.tax_breakdown = taxBreakdown;

          const { error: updateErr } = await supabase
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
    }

    // Targeted rollup recompute for all touched products
    if (touchedProductIds.size > 0) {
      const ids = Array.from(touchedProductIds);
      const ROLLUP_CHUNK = 50;
      for (let i = 0; i < ids.length; i += ROLLUP_CHUNK) {
        const chunk = ids.slice(i, i + ROLLUP_CHUNK);
        await Promise.allSettled(
          chunk.map((pid) => supabase.rpc('recompute_product_rollups', { p_product_id: pid }))
        );
        result.rollups_recomputed += chunk.length;
      }
    }

    // Log the import
    try {
      await supabase.from('supplier_import_logs').insert({
        format: 'alkor-prices',
        total_rows: rows.length,
        success_count: result.updated,
        error_count: result.errors,
        errors: result.details.slice(0, 50),
        imported_at: new Date().toISOString(),
      });
    } catch (_) { /* non-bloquant */ }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
