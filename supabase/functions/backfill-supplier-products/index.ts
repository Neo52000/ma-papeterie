import { createHandler } from "../_shared/handler.ts";

const BATCH_SIZE = 200;

Deno.serve(createHandler({
  name: "backfill-supplier-products",
  auth: "admin",
  rateLimit: { prefix: "backfill-supplier-products", max: 15, windowMs: 60_000 },
}, async ({ supabaseAdmin, body }) => {
  const { dry_run: dryRun = false, sources: targetSources = ['liderpapel', 'comlandi'] } = (body || {}) as any;
  const supplierIds: Record<string, string> = {};

  // ─── 1. Resolve CS Group supplier ID (Comlandi = Liderpapel = même fournisseur) ──
  const { data: csGroupRow } = await supabaseAdmin
    .from('suppliers')
    .select('id, name')
    .or('name.ilike.%comlandi%,name.ilike.%cs group%')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!csGroupRow) {
    // Créer le fournisseur si absent
    if (!dryRun) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('suppliers')
        .insert({ name: 'CS Group (Comlandi / Liderpapel)', is_active: true, country: 'ES' })
        .select('id')
        .single();
      if (createErr || !created) {
        return { ok: false, error: 'Cannot create CS Group supplier', dry_run: dryRun };
      }
      console.log(`Created CS Group supplier: ${created.id}`);
      supplierIds['comlandi'] = created.id;
      supplierIds['liderpapel'] = created.id;
    }
  } else {
    supplierIds['comlandi'] = csGroupRow.id;
    supplierIds['liderpapel'] = csGroupRow.id;
    console.log(`Resolved CS Group supplier: ${csGroupRow.id} (${csGroupRow.name})`);
  }

  console.log('Resolved supplier IDs:', supplierIds);

  // ─── 2. Count products to backfill via SQL RPC ──
  const { data: countData } = await supabaseAdmin
    .rpc('count_products_by_source', { sources: targetSources });
  const totalCount = countData ?? 0;

  console.log(`Total products to backfill: ${totalCount}`);

  // ─── 3. Fetch existing supplier_products to skip already-linked ones ─────
  const existingSet = new Set<string>();
  let spOffset = 0;
  while (true) {
    const { data: spRows } = await supabaseAdmin
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
    const { data: products, error: fetchErr } = await supabaseAdmin
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
      const { error: upsertErr } = await supabaseAdmin
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

  return { ok: true, stats };
}));
