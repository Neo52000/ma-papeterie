import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { normalizeEan } from "../_shared/normalize-ean.ts";
import {
  parseNum,
  cleanStr,
  resolveSupplierByCode,
  batchEanLookup,
  buildPriceHistoryEntry,
  flushBatch,
  flushCatalogBatch,
  deactivateGhostCatalogItems,
  batchRecomputeRollups,
  logImport,
  createDryRunResult,
  withRetry,
  createWarningState,
  type CatalogItemRow,
} from "../_shared/import-helpers.ts";

interface AlsoRow {
  article_number?: string;
  ean?: string;
  description?: string;
  manufacturer?: string;
  manufacturer_ref?: string;
  price?: string;
  rrp?: string;
  stock?: string;
  category?: string;
  weight?: string;
  tva?: string;
}

Deno.serve(createHandler({
  name: "import-also",
  auth: "admin-or-secret",
  rateLimit: { prefix: "import-also", max: 200, windowMs: 60_000 },
}, async ({ supabaseAdmin: supabase, body, req, corsHeaders }) => {
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > 50 * 1024 * 1024) {
    return jsonResponse({ error: 'Payload trop volumineux (max 50 MB)' }, 413, corsHeaders);
  }

  const b = body as Record<string, unknown>;
  const { rows, mode = 'enrich', dry_run = false } = b as {
    rows: AlsoRow[];
    mode?: 'create' | 'enrich';
    dry_run?: boolean;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return jsonResponse({ error: 'No rows provided' }, 400, corsHeaders);
  }

  // ── Dry-run mode ──
  if (dry_run) {
    const dryResult = createDryRunResult();
    for (const row of rows) {
      const ean = normalizeEan(row.ean);
      const ref = cleanStr(row.article_number);
      if (!ref && !ean) { dryResult.would_skip++; continue; }

      const name = cleanStr(row.description) || `Réf. ${ref || ean || 'inconnue'}`;
      try {
        if (ean) {
          const { data: existing } = await supabase
            .from('products').select('id').eq('ean', ean).maybeSingle();
          if (existing) {
            dryResult.would_update++;
            if (dryResult.sample_updates.length < 10) {
              dryResult.sample_updates.push({ ean, name, ref, changes: ['price', 'stock'] });
            }
          } else if (mode === 'create') {
            dryResult.would_create++;
            if (dryResult.sample_creates.length < 10) {
              dryResult.sample_creates.push({ ean, name, ref });
            }
          } else { dryResult.would_skip++; }
        } else if (mode === 'create') {
          dryResult.would_create++;
          if (dryResult.sample_creates.length < 10) {
            dryResult.sample_creates.push({ ean: null, name, ref });
          }
        } else { dryResult.would_skip++; }
      } catch (e: any) {
        dryResult.errors++;
        if (dryResult.sample_errors.length < 10) {
          dryResult.sample_errors.push(`${ref || ean}: ${e.message}`);
        }
      }
    }
    return new Response(JSON.stringify({ dry_run: true, ...dryResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Main import ──
  const result = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[] };
  const warningState = createWarningState();

  const priceHistoryBatch: any[] = [];
  const lifecycleLogsBatch: any[] = [];
  const supplierOffersBatch: any[] = [];
  const catalogItemsBatch: CatalogItemRow[] = [];

  // Resolve ALSO supplier IDs
  let alsoSupplierId: string | null = null;
  try {
    const { data: supplierRow } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', '%also%')
      .limit(1)
      .maybeSingle();
    if (supplierRow) alsoSupplierId = supplierRow.id;
  } catch (_) { /* ignore */ }

  const catalogSupplierId = await resolveSupplierByCode(supabase, 'ALSO');

  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    for (const row of batch) {
      const ean = normalizeEan(row.ean);
      const ref = cleanStr(row.article_number);
      const mfRef = cleanStr(row.manufacturer_ref);
      if (!ref && !ean) { result.skipped++; continue; }

      const prixHT = parseNum(row.price);
      const tvaRate = parseNum(row.tva) || 20;
      const prixTTC = prixHT > 0 ? Math.round(prixHT * (1 + tvaRate / 100) * 100) / 100 : 0;
      const rrp = parseNum(row.rrp);
      const stockQty = Math.max(0, Math.round(parseNum(row.stock)));

      const name = cleanStr(row.description) || `Réf. ${ref || ean || 'inconnue'}`;

      const productData: Record<string, any> = {
        name: name.substring(0, 255),
        description: cleanStr(row.description) || null,
        category: cleanStr(row.category) || 'Non classé',
        brand: cleanStr(row.manufacturer) || null,
        cost_price: prixHT > 0 ? prixHT : null,
        price: prixTTC || rrp || 0.01,
        price_ht: prixHT || 0,
        price_ttc: prixTTC || 0,
        public_price_ttc: rrp > 0 ? rrp : null,
        tva_rate: tvaRate,
        stock_quantity: stockQty,
        weight_kg: parseNum(row.weight) > 0 ? parseNum(row.weight) : null,
        is_active: true,
        is_end_of_life: false,
        updated_at: new Date().toISOString(),
        attributs: {
          source: 'also',
          ref_also: ref,
          manufacturer_ref: mfRef,
        },
      };

      try {
        let savedProductId: string | null = null;
        let isNew = false;

        if (ean) {
          const { data: existingArr } = await supabase
            .from('products')
            .select('id, price_ht, price_ttc, cost_price')
            .eq('ean', ean)
            .limit(1);
          const existing = existingArr?.[0] ?? null;

          if (existing) {
            // Preserve existing data when ALSO data is incomplete
            if (name.startsWith('Réf. ')) delete productData.name;
            if (!cleanStr(row.manufacturer)) delete productData.brand;
            if (!cleanStr(row.category) || productData.category === 'Non classé') {
              delete productData.category;
            }

            // Merge attributs: preserve existing supplier refs
            const { data: currentProd } = await supabase
              .from('products').select('attributs, sku_interne').eq('id', existing.id).single();
            if (currentProd?.sku_interne) delete productData.sku_interne;
            if (currentProd?.attributs && typeof currentProd.attributs === 'object') {
              productData.attributs = { ...currentProd.attributs, ...productData.attributs };
            }

            // Track price changes
            const priceEntry = buildPriceHistoryEntry(
              existing.id, 'import-also', alsoSupplierId,
              existing, { price_ht: prixHT, price_ttc: prixTTC, cost_price: prixHT || null },
              'import-also-catalogue',
            );
            if (priceEntry) priceHistoryBatch.push(priceEntry);

            const { error } = await withRetry(() => supabase
              .from('products')
              .update(productData)
              .eq('id', existing.id));
            if (error) throw error;
            savedProductId = existing.id;
            result.updated++;
          } else if (mode === 'create') {
            productData.ean = ean;
            const { data: inserted, error } = await withRetry(() => supabase
              .from('products')
              .insert(productData)
              .select('id')
              .single());
            if (error) throw error;
            savedProductId = inserted?.id || null;
            isNew = true;
            result.created++;
          } else {
            result.skipped++;
          }
        } else if (mode === 'create') {
          productData.ean = null;
          const { data: inserted, error } = await withRetry(() => supabase
            .from('products')
            .insert(productData)
            .select('id')
            .single());
          if (error) throw error;
          savedProductId = inserted?.id || null;
          isNew = true;
          result.created++;
        } else {
          result.skipped++;
        }

        // ── supplier_offers upsert (ALSO) ──
        if (savedProductId) {
          supplierOffersBatch.push({
            product_id: savedProductId,
            supplier: 'ALSO',
            supplier_product_id: ref || ean || savedProductId,
            purchase_price_ht: prixHT > 0 ? prixHT : null,
            pvp_ttc: rrp > 0 ? rrp : null,
            vat_rate: tvaRate,
            tax_breakdown: {},
            stock_qty: stockQty,
            is_active: true,
            last_seen_at: new Date().toISOString(),
          });

          // ── Dual-write: supplier_catalog_items ──
          if (catalogSupplierId) {
            catalogItemsBatch.push({
              supplier_id: catalogSupplierId,
              product_id: savedProductId,
              supplier_sku: ref || ean || savedProductId,
              supplier_ean: ean || null,
              supplier_product_name: name || null,
              supplier_family: cleanStr(row.category) || null,
              supplier_category: null,
              purchase_price_ht: prixHT > 0 ? prixHT : null,
              pvp_ttc: rrp > 0 ? rrp : null,
              vat_rate: tvaRate,
              eco_tax: null,
              tax_breakdown: null,
              stock_qty: stockQty,
              is_active: true,
              source_type: 'also',
              last_seen_at: new Date().toISOString(),
            });
          }

          // Lifecycle log
          lifecycleLogsBatch.push({
            product_id: savedProductId,
            event_type: isNew ? 'created' : 'updated',
            performed_by: 'import-also',
            details: { ref, ean, source: 'also' },
          });
        }

        // Upsert into supplier_products
        if (savedProductId && alsoSupplierId) {
          const spPrice = prixHT > 0 ? prixHT : 0.01;
          await supabase.from('supplier_products').upsert({
            supplier_id: alsoSupplierId,
            product_id: savedProductId,
            supplier_reference: ref || null,
            supplier_price: spPrice,
            stock_quantity: stockQty,
            source_type: 'also',
            is_preferred: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'supplier_id,product_id' });
        }
      } catch (e: any) {
        result.errors++;
        if (result.details.length < 30) {
          result.details.push(`${ref || ean}: ${e.message}`);
        }
      }
    }
  }

  // Flush batches
  await flushBatch(supabase, 'product_price_history', priceHistoryBatch, {
    warningState,
    label: 'product_price_history',
  });

  await flushBatch(supabase, 'product_lifecycle_logs', lifecycleLogsBatch, {
    warningState,
    label: 'product_lifecycle_logs',
  });

  await flushBatch(supabase, 'supplier_offers', supplierOffersBatch, {
    onConflict: 'supplier,supplier_product_id',
    ignoreDuplicates: false,
    warningState,
    label: 'supplier_offers',
  });

  await flushCatalogBatch(supabase, catalogItemsBatch, warningState);

  // Deactivate ghost offers
  try {
    const { data: ghostSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ghost_offer_threshold_also_days')
      .maybeSingle();
    const ghostDays = Number(ghostSetting?.value ?? 7);
    await supabase.from('supplier_offers')
      .update({ is_active: false })
      .eq('supplier', 'ALSO')
      .eq('is_active', true)
      .lt('last_seen_at', new Date(Date.now() - ghostDays * 24 * 60 * 60 * 1000).toISOString());
  } catch (_) { /* ignore */ }

  if (catalogSupplierId) {
    await deactivateGhostCatalogItems(supabase, catalogSupplierId, 'ghost_days_also');
  }

  // Batch recompute rollups
  const uniqueProductIds = [...new Set(supplierOffersBatch.map((o: any) => o.product_id))];
  await batchRecomputeRollups(supabase, uniqueProductIds);

  // Log import
  await logImport(supabase, 'also-catalogue', rows.length, result, {
    price_changes_count: priceHistoryBatch.length,
    report_data: {
      warnings_count: warningState.total,
      warnings: warningState.list,
    },
  });

  return {
    ...result,
    warnings_count: warningState.total,
    warnings: warningState.list,
  };
}));
