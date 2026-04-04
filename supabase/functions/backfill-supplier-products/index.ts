import { createHandler } from "../_shared/handler.ts";

const BATCH_SIZE = 200;

Deno.serve(createHandler({
  name: "backfill-supplier-products",
  auth: "admin",
  rateLimit: { prefix: "backfill-supplier-products", max: 15, windowMs: 60_000 },
}, async ({ supabaseAdmin, body }) => {
  const { dry_run: dryRun = false, sources: targetSources = ['liderpapel', 'comlandi', 'soft', 'also'] } = (body || {}) as any;
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

  // ─── 1b. Resolve SOFT and ALSO supplier IDs ──
  for (const [code, namePattern] of [['soft', '%soft%carrier%'], ['also', '%also%']] as const) {
    if (!targetSources.includes(code)) continue;
    const { data: row } = await supabaseAdmin
      .from('suppliers')
      .select('id, name')
      .ilike('name', namePattern)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (row) {
      supplierIds[code] = row.id;
      console.log(`Resolved ${code} supplier: ${row.id} (${row.name})`);
    } else {
      console.warn(`No active supplier found for code "${code}"`);
    }
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

  console.log('Backfill by reference complete:', stats);

  // ─── 5. Backfill supplier_products from supplier_offers (SOFT, ALKOR, COMLANDI) ──
  // supplier_offers has data for suppliers that may not have corresponding supplier_products entries.
  // This is especially important for SOFT which has 0 supplier_products but ~41k supplier_offers.
  const offerStats = {
    scanned: 0,
    inserted: 0,
    already_linked: 0,
    skipped_no_supplier: 0,
    errors: 0,
    dry_run: dryRun,
  };

  // Map supplier_offers.supplier codes to supplier IDs
  const offerCodeToSupplierId: Record<string, string> = {};
  for (const code of ['ALKOR', 'COMLANDI', 'SOFT']) {
    const lc = code.toLowerCase();
    // Try to find in resolved IDs first
    if (supplierIds[lc]) {
      offerCodeToSupplierId[code] = supplierIds[lc];
      continue;
    }
    // Otherwise look up by code
    const { data: sRow } = await supabaseAdmin
      .from('suppliers')
      .select('id')
      .eq('code', code)
      .limit(1)
      .maybeSingle();
    if (sRow) {
      offerCodeToSupplierId[code] = sRow.id;
      supplierIds[lc] = sRow.id;
    }
  }

  console.log('Offer code → supplier ID map:', offerCodeToSupplierId);

  let offerOffset = 0;
  const OFFER_BATCH = 500;

  while (true) {
    const { data: offers, error: offerFetchErr } = await supabaseAdmin
      .from('supplier_offers')
      .select('id, supplier, supplier_product_id, purchase_price_ht, stock_qty, delivery_delay_days, min_qty, product_id, is_active')
      .eq('is_active', true)
      .not('product_id', 'is', null)
      .range(offerOffset, offerOffset + OFFER_BATCH - 1);

    if (offerFetchErr) {
      console.error('supplier_offers fetch error:', offerFetchErr);
      offerStats.errors++;
      break;
    }

    if (!offers || offers.length === 0) break;
    offerStats.scanned += offers.length;

    const toInsert: Record<string, any>[] = [];

    for (const offer of offers) {
      const supplierId = offerCodeToSupplierId[offer.supplier];
      if (!supplierId) {
        offerStats.skipped_no_supplier++;
        continue;
      }

      const key = `${supplierId}::${offer.product_id}`;
      if (existingSet.has(key)) {
        offerStats.already_linked++;
        continue;
      }

      toInsert.push({
        supplier_id: supplierId,
        product_id: offer.product_id,
        supplier_reference: offer.supplier_product_id,
        supplier_price: offer.purchase_price_ht ?? 0.01,
        stock_quantity: offer.stock_qty ?? 0,
        lead_time_days: offer.delivery_delay_days ?? 0,
        min_order_quantity: offer.min_qty ?? 1,
        source_type: offer.supplier.toLowerCase(),
        is_preferred: false,
        updated_at: new Date().toISOString(),
      });

      existingSet.add(key);
    }

    if (toInsert.length > 0 && !dryRun) {
      const { error: upsertErr } = await supabaseAdmin
        .from('supplier_products')
        .upsert(toInsert, { onConflict: 'supplier_id,product_id' });

      if (upsertErr) {
        console.error('supplier_offers→supplier_products upsert error:', upsertErr, 'sample:', toInsert[0]);
        offerStats.errors += toInsert.length;
      } else {
        offerStats.inserted += toInsert.length;
      }
    } else if (toInsert.length > 0) {
      offerStats.inserted += toInsert.length;
    }

    if (offers.length < OFFER_BATCH) break;
    offerOffset += OFFER_BATCH;
  }

  console.log('Backfill from supplier_offers complete:', offerStats);

  // ─── 6. EAN-based matching: link unmatched supplier_catalog_items to products by EAN ──
  const eanStats = {
    scanned: 0,
    matched: 0,
    already_linked: 0,
    errors: 0,
    dry_run: dryRun,
  };

  let eanOffset = 0;
  const EAN_BATCH = 500;

  while (true) {
    // Fetch unlinked catalog items that have an EAN
    const { data: unmatchedItems, error: eanFetchErr } = await supabaseAdmin
      .from('supplier_catalog_items')
      .select('id, supplier_id, supplier_ean, supplier_sku, purchase_price_ht')
      .is('product_id', null)
      .not('supplier_ean', 'is', null)
      .neq('supplier_ean', '')
      .eq('is_active', true)
      .range(eanOffset, eanOffset + EAN_BATCH - 1);

    if (eanFetchErr) {
      console.error('EAN fetch error:', eanFetchErr);
      eanStats.errors++;
      break;
    }

    if (!unmatchedItems || unmatchedItems.length === 0) break;

    eanStats.scanned += unmatchedItems.length;

    // Collect unique EANs
    const eans = [...new Set(unmatchedItems.map((i: any) => i.supplier_ean).filter(Boolean))];

    if (eans.length > 0) {
      // Find matching products by EAN
      const { data: matchingProducts } = await supabaseAdmin
        .from('products')
        .select('id, ean')
        .in('ean', eans)
        .eq('is_active', true);

      if (matchingProducts && matchingProducts.length > 0) {
        const eanToProductId = new Map<string, string>();
        for (const p of matchingProducts) {
          if (p.ean) eanToProductId.set(p.ean, p.id);
        }

        // Update catalog items with matched product_id
        for (const item of unmatchedItems) {
          const productId = eanToProductId.get((item as any).supplier_ean);
          if (!productId) continue;

          if (!dryRun) {
            const { error: updateErr } = await supabaseAdmin
              .from('supplier_catalog_items')
              .update({ product_id: productId, updated_at: new Date().toISOString() })
              .eq('id', item.id);

            if (updateErr) {
              console.error('EAN update error:', updateErr);
              eanStats.errors++;
            } else {
              eanStats.matched++;
            }
          } else {
            eanStats.matched++;
          }
        }
      }
    }

    if (unmatchedItems.length < EAN_BATCH) break;
    eanOffset += EAN_BATCH;
  }

  console.log('EAN matching complete:', eanStats);
  console.log('Backfill complete:', { ref_stats: stats, offer_stats: offerStats, ean_stats: eanStats });

  return { ok: true, stats, offer_stats: offerStats, ean_stats: eanStats };
}));
