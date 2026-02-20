import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BATCH_SIZE = 200;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dry_run === true;
    const targetSources: string[] = body.sources || ['liderpapel', 'comlandi'];

    // ─── 1. Resolve / create supplier IDs ────────────────────────────────────
    const supplierIds: Record<string, string> = {};

    for (const src of targetSources) {
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', `%${src}%`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        supplierIds[src] = existing.id;
      } else if (!dryRun) {
        // Create the supplier if missing
        const supplierName = src === 'liderpapel' ? 'Liderpapel' : 'Comlandi';
        const { data: created, error: createErr } = await supabase
          .from('suppliers')
          .insert({
            name: supplierName,
            is_active: true,
            country: src === 'liderpapel' ? 'ES' : 'FR',
          })
          .select('id')
          .single();

        if (createErr) {
          console.error(`Failed to create supplier ${supplierName}:`, createErr);
        } else if (created) {
          supplierIds[src] = created.id;
          console.log(`Created supplier ${supplierName} with id ${created.id}`);
        }
      }
    }

    console.log('Resolved supplier IDs:', supplierIds);

    if (Object.keys(supplierIds).length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No supplier IDs resolved — suppliers not found in DB',
        dry_run: dryRun,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── 2. Count products to backfill ───────────────────────────────────────
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .in('attributs->>source' as any, targetSources);

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
      const { data: products, error: fetchErr } = await supabase
        .from('products')
        .select('id, ean, cost_price, price_ht, stock_quantity, attributs, ref_b2b, sku_interne')
        .in('attributs->>source' as any, targetSources)
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        stats.errors++;
        break;
      }

      if (!products || products.length === 0) break;

      stats.total_products_scanned += products.length;

      const toInsert: Record<string, any>[] = [];

      for (const product of products) {
        const src = (product.attributs as any)?.source as string;
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
        const attrs = product.attributs as Record<string, any> || {};
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
