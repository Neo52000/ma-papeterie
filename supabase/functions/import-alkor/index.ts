import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface AlkorRow {
  famille?: string;
  sous_famille?: string;
  nomenclature?: string;
  ref_art?: string;
  description?: string;
  libelle_court?: string;
  libelle_complementaire?: string;
  libelle_commercial?: string;
  cycle_vie?: string;
  statut?: string;
  remplacement?: string;
  code_fabricant?: string;
  nom_fabricant?: string;
  fournisseur?: string;
  ref_commerciale?: string;
  article_mdd?: string;
  marque_produit?: string;
  marque_fabricant?: string;
  produit_eco?: string;
  norme_env1?: string;
  norme_env2?: string;
  num_agreement?: string;
  eligible_agec?: string;
  reutilisation?: string;
  complement_env?: string;
  tx_recycle?: string;
  tx_recyclable?: string;
  duree_garantie?: string;
  ean?: string;
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

    const { rows, mode } = await req.json() as { rows: AlkorRow[]; mode: 'create' | 'enrich' };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No rows provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[], rollups_recomputed: 0 };
    const alkorOffersBatch: any[] = [];
    const supplierProductsBatch: any[] = [];
    const touchedProductIds = new Set<string>();

    // Resolve ALKOR supplier_id once
    const { data: alkorSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', '%alkor%')
      .limit(1)
      .maybeSingle();
    const alkorSupplierId = alkorSupplier?.id ?? null;

    // ── Batch EAN lookup: single query instead of N individual SELECTs ──
    const allEans = rows
      .map(r => r.ean?.trim())
      .filter((e): e is string => !!e && e.length > 0);
    const uniqueEans = [...new Set(allEans)];

    // ean → product_id[] (supports multiple products sharing the same EAN)
    const existingByEan = new Map<string, string[]>();
    if (uniqueEans.length > 0) {
      // Supabase IN filter supports up to ~1000 items; chunk if needed
      const EAN_CHUNK = 500;
      for (let i = 0; i < uniqueEans.length; i += EAN_CHUNK) {
        const chunk = uniqueEans.slice(i, i + EAN_CHUNK);
        const { data: existing } = await supabase
          .from('products')
          .select('id, ean')
          .in('ean', chunk);
        for (const p of existing || []) {
          if (p.ean) {
            const ids = existingByEan.get(p.ean) || [];
            ids.push(p.id);
            existingByEan.set(p.ean, ids);
          }
        }
      }
    }

    // ── Process rows ──
    for (const row of rows) {
      const ean = row.ean?.trim();
      const ref = row.ref_art?.trim();
      if (!ref && !ean) { result.skipped++; continue; }

      const isActive = row.cycle_vie?.trim()?.toLowerCase() === 'actif';
      const isEco = row.produit_eco?.trim()?.toUpperCase() === 'X';
      const description = row.libelle_commercial?.trim() || row.description?.trim() || '';
      const name = row.description?.trim() || row.libelle_court?.trim() || 'Sans nom';

      const productData: Record<string, any> = {
        name: name.substring(0, 255),
        name_short: row.libelle_court?.trim()?.substring(0, 60) || null,
        description: description || null,
        category: row.famille?.trim() || 'Non classé',
        subcategory: row.sous_famille?.trim() || null,
        brand: row.marque_produit?.trim() || row.marque_fabricant?.trim() || null,
        manufacturer_code: row.code_fabricant?.trim() || null,
        oem_ref: row.ref_commerciale?.trim() || null,
        eco: isEco,
        is_end_of_life: !isActive,
        is_active: isActive,
        updated_at: new Date().toISOString(),
        attributs: {
          source: 'alkor',
          ref_alkor: ref,
          nom_fabricant: row.nom_fabricant?.trim() || null,
          fournisseur: row.fournisseur?.trim() || null,
          article_mdd: row.article_mdd?.trim() === 'X',
          norme_env1: row.norme_env1?.trim() || null,
          norme_env2: row.norme_env2?.trim() || null,
          num_agreement: row.num_agreement?.trim() || null,
          eligible_agec: row.eligible_agec?.trim()?.toLowerCase() === 'oui',
          complement_env: row.complement_env?.trim() || null,
          tx_recycle: row.tx_recycle?.trim() || null,
          tx_recyclable: row.tx_recyclable?.trim() || null,
          remplacement: row.remplacement?.trim() || null,
        },
      };

      try {
        // Collect all product IDs to link (supports multiple products sharing same EAN)
        const savedProductIds: string[] = [];

        if (ean) {
          // Use batch-loaded map instead of individual query
          const existingIds = existingByEan.get(ean);

          if (existingIds && existingIds.length > 0) {
            // Enrich the first existing product with full data
            const { error } = await supabase
              .from('products')
              .update(productData)
              .eq('id', existingIds[0]);
            if (error) throw error;
            // Track all products sharing this EAN for supplier linking
            savedProductIds.push(...existingIds);
            result.updated++;
          } else if (mode === 'create') {
            // Create new product
            productData.ean = ean;
            productData.price = 0.01;
            productData.price_ht = 0;
            productData.price_ttc = 0;
            const { data: inserted, error } = await supabase
              .from('products')
              .insert(productData)
              .select('id')
              .single();
            if (error) throw error;
            const newId = inserted?.id || null;
            // Add to map so subsequent rows with same EAN find it
            if (newId) {
              existingByEan.set(ean, [newId]);
              savedProductIds.push(newId);
            }
            result.created++;
          } else {
            result.skipped++;
          }
        } else if (mode === 'create') {
          // No EAN, create with ref as identifier
          productData.ean = null;
          productData.price = 0.01;
          productData.price_ht = 0;
          productData.price_ttc = 0;
          const { data: inserted, error } = await supabase
            .from('products')
            .insert(productData)
            .select('id')
            .single();
          if (error) throw error;
          if (inserted?.id) savedProductIds.push(inserted.id);
          result.created++;
        } else {
          result.skipped++;
        }

        // Track touched products for targeted rollup recompute
        for (const pid of savedProductIds) touchedProductIds.add(pid);

        // ── supplier_offers upsert — unique per (supplier, supplier_product_id),
        // so only link to the first product; cross-EAN matching on the client side
        // will surface it for all products sharing this EAN ──
        if (savedProductIds.length > 0 && ref) {
          alkorOffersBatch.push({
            product_id: savedProductIds[0],
            supplier: 'ALKOR',
            supplier_product_id: ref,
            purchase_price_ht: null,
            pvp_ttc: null,
            vat_rate: 20,
            tax_breakdown: {},
            stock_qty: 0,
            is_active: isActive,
            last_seen_at: new Date().toISOString(),
          });
        }

        // ── supplier_products upsert — unique per (supplier_id, product_id),
        // so we can (and should) create one entry per product sharing this EAN ──
        if (alkorSupplierId && ref) {
          for (const savedProductId of savedProductIds) {
            supplierProductsBatch.push({
              supplier_id: alkorSupplierId,
              product_id: savedProductId,
              supplier_reference: ref,
              source_type: 'alkor-catalogue',
              is_preferred: false,
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (e: any) {
        result.errors++;
        if (result.details.length < 30) {
          result.details.push(`${ref || ean}: ${e.message}`);
        }
      }
    }

    // ── Flush supplier_offers (ALKOR) ──
    if (alkorOffersBatch.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < alkorOffersBatch.length; i += CHUNK) {
        try {
          await supabase.from('supplier_offers').upsert(
            alkorOffersBatch.slice(i, i + CHUNK),
            { onConflict: 'supplier,supplier_product_id', ignoreDuplicates: false }
          );
        } catch (_) { /* non-bloquant */ }
      }
    }

    // ── Flush supplier_products (stable mapping) ──
    if (supplierProductsBatch.length > 0 && alkorSupplierId) {
      const CHUNK = 50;
      for (let i = 0; i < supplierProductsBatch.length; i += CHUNK) {
        try {
          await supabase.from('supplier_products').upsert(
            supplierProductsBatch.slice(i, i + CHUNK),
            { onConflict: 'supplier_id,product_id', ignoreDuplicates: false }
          );
        } catch (_) { /* non-bloquant */ }
      }
    }

    // Désactiver les offres ALKOR fantômes — seuil dynamique depuis app_settings
    try {
      const { data: ghostSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ghost_offer_threshold_alkor_days')
        .maybeSingle();
      const ghostDays = Number(ghostSetting?.value ?? 3);
      await supabase.from('supplier_offers')
        .update({ is_active: false })
        .eq('supplier', 'ALKOR')
        .eq('is_active', true)
        .lt('last_seen_at', new Date(Date.now() - ghostDays * 24 * 60 * 60 * 1000).toISOString());
    } catch (_) { /* ignore */ }

    // ── Batch rollup: single RPC call instead of N individual calls ──
    if (touchedProductIds.size > 0) {
      const ids = Array.from(touchedProductIds);
      try {
        const { data } = await supabase.rpc('recompute_product_rollups_batch', {
          p_product_ids: ids,
        });
        result.rollups_recomputed = data?.processed || ids.length;
      } catch (_) {
        // Fallback: try individual calls in small chunks (legacy approach)
        const ROLLUP_CHUNK = 50;
        for (let i = 0; i < ids.length; i += ROLLUP_CHUNK) {
          const chunk = ids.slice(i, i + ROLLUP_CHUNK);
          await Promise.allSettled(
            chunk.map((pid) =>
              supabase.rpc('recompute_product_rollups', { p_product_id: pid })
            )
          );
          result.rollups_recomputed += chunk.length;
        }
      }
    }

    // Log the import
    try {
      await supabase.from('supplier_import_logs').insert({
        format: 'alkor-catalogue',
        total_rows: rows.length,
        success_count: result.created + result.updated,
        error_count: result.errors,
        errors: result.details.slice(0, 50),
        imported_at: new Date().toISOString(),
      });
    } catch (_) {
      // ignore logging errors
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
