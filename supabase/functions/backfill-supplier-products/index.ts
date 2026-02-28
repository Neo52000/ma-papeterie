import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";

const BATCH_SIZE = 200;

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const authResult = await requireAdmin(req, corsHeaders);
  if ('error' in authResult) return authResult.error;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dry_run === true;
    const targetSources: string[] = body.sources || ['liderpapel', 'comlandi'];
    const supplierIds: Record<string, string> = {};

    // ─── 1. Resolve CS Group supplier ID (Comlandi = Liderpapel = même fournisseur) ──
    // Les deux sources 'comlandi' et 'liderpapel' pointent vers le MÊME fournisseur
    const { data: csGroupRow } = await supabase
      .from('suppliers')
      .select('id, name')
      .or('name.ilike.%comlandi%,name.ilike.%cs group%')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!csGroupRow) {
      // Créer le fournisseur si absent
      if (!dryRun) {
        const { data: created, error: createErr } = await supabase
          .from('suppliers')
          .insert({ name: 'CS Group (Comlandi / Liderpapel)', is_active: true, country: 'ES' })
          .select('id')
          .single();
        if (createErr || !created) {
          return new Response(JSON.stringify({ ok: false, error: 'Cannot create CS Group supplier', dry_run: dryRun }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.log(`Created CS Group supplier: ${created.id}`);
        // Mapper les deux sources vers le même ID
        supplierIds['comlandi'] = created.id;
        supplierIds['liderpapel'] = created.id;
      }
    } else {
      // Les deux sources → même ID fournisseur
      supplierIds['comlandi'] = csGroupRow.id;
      supplierIds['liderpapel'] = csGroupRow.id;
      console.log(`Resolved CS Group supplier: ${csGroupRow.id} (${csGroupRow.name})`);
    }

    console.log('Resolved supplier IDs:', supplierIds);

    // ─── 2. Count products to backfill via SQL RPC (évite le filtre JSONB invalide) ──
    const { data: countData } = await supabase
      .rpc('count_products_by_source', { sources: targetSources });
    const totalCount = countData ?? 0;

    console.log(`Total products to backfill: ${totalCount}`);

    // ─── 3. Fetch existing supplier_products to skip already-linked ones ─────
    const existingSet = new Set<string>();
    let spOffset = 0;
    while (true) {
      const { data: spRows } = await supabase
        .from('supplier_products')
        .select('supplier_id, product_id')
        .range(spOffset, spOffset + 999);

      if (!spRows || spRows.length === 0) break;
      for (const r of spRows) {
        existingSet.add(`${r.supplier_id}::${r.product_id}`);
      }
      if (spRows.length < 1000) break;
      spOffset += 1000;
    }

    console.log(`Existing supplier_products entries: ${existingSet.size}`);

    // ─── 4. Paginate through products and upsert ─────────────────────────────
    const stats = {
      total_products_scanned: 0,
      already_linked: 0,
      inserted: 0,
      skipped_no_supplier: 0,
      errors: 0,
      dry_run: dryRun,
    };

    let offset = 0;

    while (true) {
      // Utilise le RPC SQL pour filtrer sur JSONB (filtre .in() sur JSONB invalide en PostgREST)
      const { data: products, error: fetchErr } = await supabase
        .rpc('get_products_by_source', { sources: targetSources, p_limit: BATCH_SIZE, p_offset: offset });

      if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        stats.errors++;
        break;
      }

      if (!products || products.length === 0) break;

      stats.total_products_scanned += products.length;

      const toInsert: Record<string, any>[] = [];

      for (const product of products) {
        // Le RPC renvoie source_val directement (plus besoin de parser attributs)
        const src = (product as any).source_val as string;
        const supplierId = supplierIds[src];

        if (!supplierId) {
          stats.skipped_no_supplier++;
          continue;
        }

        const key = `${supplierId}::${product.id}`;
        if (existingSet.has(key)) {
          stats.already_linked++;
          continue;
        }

        // Extract supplier reference from attributs
        const attrs = (product.attributs as Record<string, any>) || {};
        const supplierRef: string | null =
          attrs.ref_liderpapel ||
          attrs.ref_comlandi ||
          attrs.code_comlandi ||
          product.ref_b2b ||
          product.sku_interne ||
          null;

        toInsert.push({
          supplier_id: supplierId,
          product_id: product.id,
          supplier_reference: supplierRef,
          // Comlandi: cost_price is always NULL — fallback to price_ht (B2B purchase price)
          // price_ht is the correct supplier price for Comlandi products
          supplier_price: product.cost_price ?? (product as any).price_ht ?? 0.01,
          stock_quantity: product.stock_quantity ?? 0,
          source_type: src,
          is_preferred: false,
          updated_at: new Date().toISOString(),
        });

        // Mark as seen to avoid duplicates within this run
        existingSet.add(key);
      }

      if (toInsert.length > 0 && !dryRun) {
        const { error: upsertErr } = await supabase
          .from('supplier_products')
          .upsert(toInsert, { onConflict: 'supplier_id,product_id' });

        if (upsertErr) {
          console.error('Upsert error:', upsertErr, 'sample:', toInsert[0]);
          stats.errors += toInsert.length;
        } else {
          stats.inserted += toInsert.length;
        }
      } else {
        stats.inserted += toInsert.length; // counted even in dry_run
      }

      if (products.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    console.log('Backfill complete:', stats);

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Backfill error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
