import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { normalizeEan } from "../_shared/normalize-ean.ts";
import {
  parseNum,
  cleanStr,
  resolveSupplier,
  batchEanLookup,
  buildPriceHistoryEntry,
  flushBatch,
  createWarningState,
  pushWarning,
  deactivateGhostOffers,
  batchRecomputeRollups,
  logImport,
  resolveCategory,
  createUnverifiedMapping,
  createDryRunResult,
  withRetry,
  resolveSupplierByCode,
  flushCatalogBatch,
  deactivateGhostCatalogItems,
  type CatalogItemRow,
  type WarningState,
} from "../_shared/import-helpers.ts";

Deno.serve(createHandler({
  name: "import-softcarrier",
  auth: "admin-or-secret",
  rateLimit: { prefix: "import-softcarrier", max: 30, windowMs: 60_000 },
  maxBodyBytes: 50 * 1024 * 1024,
}, async ({ supabaseAdmin: supabase, body, corsHeaders }) => {
    const { source, data, rows: preRows, dry_run = false } = body as Record<string, any>;
    if (!source || (!data && !preRows)) {
      return jsonResponse({ error: 'Missing source or data/rows' }, 400, corsHeaders);
    }

    const result: { created: number; updated: number; success: number; errors: number; skipped: number; details: string[] } = {
      created: 0, updated: 0, success: 0, errors: 0, skipped: 0, details: []
    };

    const warningState = createWarningState();

    const addError = (msg: string) => {
      result.errors++;
      if (result.details.length < 50) result.details.push(msg);
    };

    // ── Dry-run mode ──
    if (dry_run) {
      const dryResult = createDryRunResult();
      switch (source) {
        case 'preislis': {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          for (const line of lines) {
            const cols = line.split('\t');
            if (cols.length < 30) { dryResult.would_skip++; continue; }
            const ref = cols[2]?.trim();
            if (!ref || ref.length < 3) { dryResult.would_skip++; continue; }
            const name = cols[3]?.trim() || cols[27]?.trim() || ref || `Réf. ${ref || normalizeEan(cols[29]) || 'inconnue'}`;
            const ean = normalizeEan(cols[29]);
            try {
              const { data: existing } = await supabase
                .from('products').select('id').eq('ref_softcarrier', ref).maybeSingle();
              if (existing) {
                dryResult.would_update++;
                if (dryResult.sample_updates.length < 10) {
                  dryResult.sample_updates.push({ ean, name, ref, changes: ['price', 'stock', 'description'] });
                }
              } else {
                dryResult.would_create++;
                if (dryResult.sample_creates.length < 10) {
                  dryResult.sample_creates.push({ ean, name, ref });
                }
              }
            } catch (e: any) {
              dryResult.errors++;
              if (dryResult.sample_errors.length < 10) dryResult.sample_errors.push(`${ref}: ${e.message}`);
            }
          }
          break;
        }
        case 'artx': {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          for (const line of lines) {
            if (line.length < 22) { dryResult.would_skip++; continue; }
            const lang = line.substring(1, 4).trim();
            if (lang !== '003') { dryResult.would_skip++; continue; }
            const ref = line.substring(4, 22).trim();
            if (!ref) { dryResult.would_skip++; continue; }
            dryResult.would_update++;
            if (dryResult.sample_updates.length < 10) {
              dryResult.sample_updates.push({ ean: null, name: ref, ref, changes: ['description'] });
            }
          }
          break;
        }
        case 'tarifsb2b': {
          let cleanData = data;
          if (cleanData.charCodeAt(0) === 0xFEFF) cleanData = cleanData.substring(1);
          const lines = cleanData.split(/\r?\n/).filter((l: string) => l.trim());
          if (lines.length >= 2) {
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(';');
              if (cols.length < 5) continue;
              const ref = cols[1]?.trim() || cols[0]?.trim();
              if (!ref) { dryResult.would_skip++; continue; }
              dryResult.would_update++;
              if (dryResult.sample_updates.length < 10) {
                dryResult.sample_updates.push({ ean: null, name: ref, ref, changes: ['description', 'brand', 'category', 'packaging'] });
              }
            }
          }
          break;
        }
        case 'herstinfo': {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          for (const line of lines) {
            const cols = line.split('\t');
            const name = cols[0]?.trim();
            if (!name) { dryResult.would_skip++; continue; }
            dryResult.would_create++;
          }
          break;
        }
        case 'lagerbestand': {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          const startIdx = (lines[0] && /^[a-zA-Z]/.test(lines[0].split(';')[0])) ? 1 : 0;
          for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i].split(';');
            if (cols.length < 2 || !cols[0]?.trim()) { dryResult.would_skip++; continue; }
            dryResult.would_update++;
          }
          break;
        }
      }
      return new Response(JSON.stringify({ dry_run: true, source, ...dryResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Résoudre une fois l'ID fournisseur SOFT pour le log d'import (hors blocs case)
    const softCatalogSupplierId = await resolveSupplierByCode(supabase, 'SOFT');

    switch (source) {
      // ───────────────────────────────────────────────
      // HERSTINFO.TXT — Référentiel marques/fabricants
      // ───────────────────────────────────────────────
      case 'herstinfo': {
        // Support both raw text and pre-parsed rows
        let parsedRows: Array<{ name: string; company: string; country: string; website: string }>;
        if (preRows) {
          parsedRows = preRows;
        } else {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          parsedRows = [];
          for (const line of lines) {
            const cols = line.split('\t');
            const name = cols[0]?.trim();
            if (!name) continue;
            parsedRows.push({
              name,
              company: cols[1]?.trim() || '',
              country: cols[4]?.trim() || '',
              website: cols[7]?.trim() || '',
            });
          }
        }

        const recordsBatch: any[] = [];
        for (const row of parsedRows) {
          if (!row.name) continue;
          recordsBatch.push({
            name: row.name,
            company: row.company || null,
            country: row.country || null,
            website: row.website || null,
            code: row.name.substring(0, 10).toUpperCase().replace(/\s+/g, '_'),
            updated_at: new Date().toISOString(),
          });
        }

        const flushResult = await flushBatch(supabase, 'brands', recordsBatch, {
          onConflict: 'name',
          warningState,
          label: 'brands',
        });
        result.success = flushResult.attempted - flushResult.failed;
        result.errors = flushResult.failed;
        break;
      }

      // ───────────────────────────────────────────────
      // PREISLIS.TXT — Liste de prix principale
      // ───────────────────────────────────────────────
      case 'preislis': {
        // Parse rows from raw text or use pre-parsed rows
        interface PreislisRow {
          ref: string; name: string; category: string; subcategory: string;
          brand: string; oem_ref: string; ean: string; description: string;
          price_ht: string; vat_code: string; stock_qty: string; min_qty: string;
          weight_kg: string; is_end_of_life: string; is_special_order: string;
          country_origin: string; [key: string]: string;
        }

        let parsedRows: PreislisRow[];
        if (preRows) {
          parsedRows = preRows;
        } else {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          parsedRows = [];
          for (const line of lines) {
            const cols = line.split('\t');
            if (cols.length < 30) { result.skipped++; continue; }
            const ref = cols[2]?.trim();
            if (!ref || ref.length < 3) { result.skipped++; continue; }
            const descParts = [cols[4], cols[5], cols[6], cols[7], cols[8]].map(c => c?.trim()).filter(Boolean);
            const row: any = {
              ref, name: cols[3]?.trim() || cols[27]?.trim() || ref,
              category: cols[0]?.trim() || 'Non classé', subcategory: cols[1]?.trim() || '',
              brand: cols[27]?.trim() || '', oem_ref: cols[28]?.trim() || '',
              ean: normalizeEan(cols[29]) || '', description: descParts.join(' '),
              price_ht: cols[10]?.trim() || '0', vat_code: cols[37]?.trim() || '1',
              stock_qty: cols[36]?.trim() || '0', min_qty: cols[22]?.trim() || '1',
              weight_kg: cols[23]?.trim() || '', is_end_of_life: cols[34]?.trim() || '0',
              is_special_order: cols[35]?.trim() || '0', country_origin: cols[32]?.trim() || '',
            };
            for (let t = 0; t < 6; t++) {
              row[`tier${t + 1}_qty`] = cols[9 + (t * 2)]?.trim() || '';
              row[`tier${t + 1}_price`] = cols[10 + (t * 2)]?.trim() || '';
            }
            parsedRows.push(row);
          }
        }

        // ── BATCH LOOKUPS (replaces N+1 individual queries) ──
        const allRefs = parsedRows.map(r => r.ref).filter(Boolean);
        const allEans = parsedRows.map(r => normalizeEan(r.ean)).filter(Boolean);

        // Batch lookup by ref_softcarrier
        const refMap = new Map<string, any>();
        for (let i = 0; i < allRefs.length; i += 500) {
          const chunk = allRefs.slice(i, i + 500);
          const { data: found } = await supabase.from('products')
            .select('id, ref_softcarrier, price_ht, price_ttc, cost_price, name')
            .in('ref_softcarrier', chunk);
          for (const p of found || []) refMap.set(p.ref_softcarrier, p);
        }

        // Batch lookup by EAN
        const eanMap = await batchEanLookup(supabase, allEans, 'id, ean, ref_softcarrier, name');

        // Category cache
        const catCache = new Map<string, string | null>();

        const softOffersBatch: any[] = [];
        const catalogBatch: CatalogItemRow[] = [];
        const priceHistoryBatch: any[] = [];
        const softSupplierId = await resolveSupplier(supabase, 'softcarrier');
        const catalogSupplierId = await resolveSupplierByCode(supabase, 'SOFT');

        // ── Load pricing coefficients (PA → PV HT) ──
        const DEFAULT_COEFFICIENT = 1.619;
        const coeffMap = new Map<string, number>();
        try {
          const { data: coeffRows } = await supabase
            .from('softcarrier_pricing_coefficients')
            .select('family, subfamily, coefficient')
            .eq('is_active', true);
          for (const c of coeffRows || []) {
            const key = `${c.family}::${c.subfamily || ''}`;
            coeffMap.set(key, Number(c.coefficient));
          }
        } catch (_e) {
          // Table may not exist yet — use default coefficient
        }

        function resolveCoefficient(category: string, subcategory?: string | null): number {
          // 1. Exact family + subfamily
          if (subcategory) {
            const exact = coeffMap.get(`${category}::${subcategory}`);
            if (exact) return exact;
          }
          // 2. Family only
          const familyOnly = coeffMap.get(`${category}::`);
          if (familyOnly) return familyOnly;
          // 3. Global wildcard
          const global = coeffMap.get('*::');
          if (global) return global;
          // 4. Hardcoded fallback
          return DEFAULT_COEFFICIENT;
        }

        for (const row of parsedRows) {
          const ref = row.ref;
          if (!ref || ref.length < 3) { result.skipped++; continue; }

          try {
            const costPrice = parseNum(row.price_ht); // Column 10 = prix d'achat HT
            const vatCode = parseInt(row.vat_code) || 1;
            const vatRate = vatCode === 2 ? 1.055 : 1.20;
            const stockQty = parseInt(row.stock_qty) || 0;
            const isEndOfLife = row.is_end_of_life === '1';

            // Apply coefficient PA → PV HT
            const coeff = resolveCoefficient(row.category, row.subcategory);
            const sellingPriceHt = costPrice > 0 ? Math.round(costPrice * coeff * 100) / 100 : 0;
            const sellingPriceTtc = sellingPriceHt > 0 ? Math.round(sellingPriceHt * vatRate * 100) / 100 : 0;

            const productData: Record<string, any> = {
              ref_softcarrier: ref,
              name: (row.name || `Réf. ${ref || normalizeEan(row.ean) || 'inconnue'}`).substring(0, 255),
              category: row.category || 'Non classé',
              subcategory: row.subcategory || null,
              brand: row.brand || null,
              oem_ref: row.oem_ref || null,
              ean: normalizeEan(row.ean) || null,
              vat_code: vatCode,
              cost_price: costPrice > 0 ? costPrice : null,
              price: sellingPriceTtc > 0 ? sellingPriceTtc : 0.01,
              price_ht: sellingPriceHt,
              price_ttc: sellingPriceTtc,
              margin_percent: costPrice > 0 && sellingPriceHt > 0 ? Math.round((1 - costPrice / sellingPriceHt) * 100 * 100) / 100 : null,
              weight_kg: parseNum(row.weight_kg) || null,
              stock_quantity: stockQty,
              eco_tax: 0,
              is_end_of_life: isEndOfLife,
              is_special_order: row.is_special_order === '1',
              country_origin: row.country_origin || null,
              updated_at: new Date().toISOString(),
            };

            if (row.description) productData.description = row.description;

            // ── Name protection: don't overwrite French names with German ones ──
            // If the product already exists and has a non-generic name, keep it
            const existingName = refMap.get(ref)?.name || eanMap.get(normalizeEan(row.ean))?.name;
            if (existingName && existingName !== 'Sans nom' && !existingName.startsWith('Réf. ')) {
              delete productData.name;
            }

            // Category mapping (cached)
            if (softSupplierId && productData.category !== 'Non classé') {
              const catKey = `${productData.category}::${productData.subcategory || ''}`;
              if (!catCache.has(catKey)) {
                let catId = await resolveCategory(supabase, softSupplierId, productData.category, productData.subcategory);
                if (!catId) {
                  const { data: catByName } = await supabase
                    .from('categories').select('id')
                    .ilike('name', productData.category)
                    .eq('is_active', true).limit(1).maybeSingle();
                  if (catByName) {
                    await createUnverifiedMapping(supabase, softSupplierId, productData.category, productData.subcategory, catByName.id);
                    catId = catByName.id;
                  }
                }
                catCache.set(catKey, catId);
              }
              const cachedCatId = catCache.get(catKey);
              // cachedCatId used for supplier_category_mappings only, not on products table
            }

            // ── Resolve product ID using batch maps ──
            let productId: string;
            const eanNormalized = normalizeEan(row.ean);
            let foundByEan = false;

            if (eanNormalized) {
              const byEan = eanMap.get(eanNormalized);
              if (byEan && !byEan.ref_softcarrier) {
                const updateData = { ref_softcarrier: ref, ...productData };
                if (updateData.name && (updateData.name === 'Sans nom' || updateData.name.startsWith('Réf. ') || updateData.name === ref)) {
                  delete updateData.name;
                }
                if (!updateData.brand) delete updateData.brand;
                if (updateData.category === 'Non classé') delete updateData.category;

                await withRetry(() => supabase.from('products').update(updateData).eq('id', byEan.id));
                productId = byEan.id;
                foundByEan = true;
                result.updated++;
              } else if (byEan && byEan.ref_softcarrier === ref) {
                productId = byEan.id;
                foundByEan = true;
              }
            }

            if (!foundByEan) {
              const existingProd = refMap.get(ref);
              if (existingProd) {
                const priceEntry = buildPriceHistoryEntry(
                  existingProd.id, 'import-softcarrier-preislis', softSupplierId,
                  existingProd, { price_ht: productData.price_ht, price_ttc: productData.price_ttc, cost_price: costPrice > 0 ? costPrice : null },
                  'import-softcarrier-preislis',
                );
                if (priceEntry) priceHistoryBatch.push(priceEntry);
                result.updated++;
              } else {
                result.created++;
              }

              const { data: upserted, error: prodError } = await withRetry(() =>
                supabase.from('products')
                  .upsert(productData, { onConflict: 'ref_softcarrier' })
                  .select('id')
                  .single()
              );
              if (prodError) throw prodError;
              productId = upserted.id;
            }

            // Price tiers
            await supabase.from('supplier_price_tiers').delete().eq('product_id', productId);

            const tiers: any[] = [];
            for (let t = 0; t < 6; t++) {
              const qty = parseInt(row[`tier${t + 1}_qty`]) || 0;
              const tierCost = parseNum(row[`tier${t + 1}_price`]); // PA HT du palier
              if (qty > 0 && tierCost > 0) {
                tiers.push({
                  product_id: productId,
                  tier: t + 1,
                  min_qty: qty,
                  price_ht: Math.round(tierCost * coeff * 100) / 100, // PV HT avec coefficient
                  price_pvp: null,
                  tax_cop: 0,
                  tax_d3e: 0,
                });
              }
            }

            if (tiers.length > 0) {
              await withRetry(() => supabase.from('supplier_price_tiers').insert(tiers));
            }

            // Collect supplier_offers
            softOffersBatch.push({
              product_id: productId,
              supplier: 'SOFT',
              supplier_product_id: ref,
              purchase_price_ht: costPrice > 0 ? costPrice : null,
              pvp_ttc: null,
              vat_rate: vatCode === 2 ? 5.5 : 20,
              tax_breakdown: {},
              stock_qty: stockQty,
              min_qty: parseInt(row.min_qty) || 1,
              is_active: !isEndOfLife,
              last_seen_at: new Date().toISOString(),
            });

            // Collect supplier_catalog_items (dual-write)
            if (catalogSupplierId) {
              catalogBatch.push({
                supplier_id: catalogSupplierId,
                product_id: productId,
                supplier_sku: ref,
                supplier_ean: normalizeEan(row.ean) || null,
                supplier_product_name: productData.name,
                supplier_family: productData.category !== 'Non classé' ? productData.category : null,
                supplier_subfamily: productData.subcategory || null,
                purchase_price_ht: costPrice > 0 ? costPrice : null,
                pvp_ttc: null,
                vat_rate: vatCode === 2 ? 5.5 : 20,
                tax_breakdown: {},
                stock_qty: stockQty,
                min_order_qty: parseInt(row.min_qty) || 1,
                is_active: !isEndOfLife,
                source_type: 'preislis',
                last_seen_at: new Date().toISOString(),
              });
            }

            result.success++;
          } catch (e: any) {
            addError(`PREISLIS ${ref}: ${e.message}`);
          }
        }

        // Flush price history
        if (priceHistoryBatch.length > 0) {
          await flushBatch(supabase, 'product_price_history', priceHistoryBatch, {
            warningState,
            label: 'product_price_history',
          });
        }

        // Flush supplier_offers
        await flushBatch(supabase, 'supplier_offers', softOffersBatch, {
          onConflict: 'supplier,supplier_product_id',
          warningState,
          label: 'supplier_offers',
        });

        // Flush supplier_catalog_items (dual-write)
        if (catalogSupplierId) {
          await flushCatalogBatch(supabase, catalogBatch, warningState);
        }

        // Deactivate ghost offers
        await deactivateGhostOffers(supabase, 'SOFT', 'ghost_offer_threshold_soft_days', 7);

        // Deactivate ghost catalog items (dual-write)
        if (catalogSupplierId) {
          await deactivateGhostCatalogItems(supabase, catalogSupplierId, 'ghost_offer_threshold_soft_days', 7);
        }

        // Batch recompute rollups
        const productIds = softOffersBatch.map((o: any) => o.product_id).filter(Boolean);
        await batchRecomputeRollups(supabase, productIds);

        break;
      }

      // ───────────────────────────────────────────────
      // ARTX.IMP — Désignations complètes (batched)
      // ───────────────────────────────────────────────
      case 'artx': {
        // Support both raw text and pre-parsed rows
        let updateBatch: Array<{ ref: string; description: string }>;
        if (preRows) {
          updateBatch = preRows.filter((r: any) => r.ref && r.description);
        } else {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          updateBatch = [];

          for (const line of lines) {
            if (line.length < 22) { result.skipped++; continue; }

            const lang = line.substring(1, 4).trim();
            if (lang !== '003') { result.skipped++; continue; }

            const ref = line.substring(4, 22).trim();
            if (!ref) { result.skipped++; continue; }

            const descBlocks: string[] = [];
            for (let i = 0; i < 62; i++) {
              const start = 22 + (i * 60);
              if (start >= line.length) break;
              const block = line.substring(start, start + 60).trim();
              if (block) descBlocks.push(block);
            }
            const description = descBlocks.join(' ').trim();

            if (description) {
              updateBatch.push({ ref, description });
            } else {
              result.skipped++;
            }
          }
        }

        // Batch update descriptions + name (French) in chunks of 50
        const ARTX_CHUNK = 50;
        for (let i = 0; i < updateBatch.length; i += ARTX_CHUNK) {
          const chunk = updateBatch.slice(i, i + ARTX_CHUNK);
          await Promise.allSettled(
            chunk.map(async ({ ref, description }) => {
              try {
                // Use first line of French description as product name (truncated to 255 chars)
                const frenchName = description.split(/[.\n]/)[0]?.trim().substring(0, 255) || null;
                const updateData: Record<string, any> = {
                  description,
                  updated_at: new Date().toISOString(),
                };
                if (frenchName && frenchName.length > 5) {
                  updateData.name = frenchName;
                }
                await withRetry(() =>
                  supabase.from('products')
                    .update(updateData)
                    .eq('ref_softcarrier', ref)
                );
                result.success++;
              } catch (e: any) {
                addError(`ARTX ${ref}: ${e.message}`);
              }
            })
          );
        }
        break;
      }

      // ───────────────────────────────────────────────
      // TarifsB2B.csv — Catalogue B2B enrichi (batched)
      // ───────────────────────────────────────────────
      case 'tarifsb2b': {
        // Support both raw text and pre-parsed rows
        interface B2BRow { ref?: string; code?: string; description?: string; short_desc?: string; price?: string; pvp?: string; tva?: string; brand?: string; category?: string; subcategory?: string; tax_cop?: string; tax_d3e?: string; umv_qty?: string; umv_ean?: string; uve_qty?: string; uve_ean?: string; env_qty?: string; env_ean?: string; weight_umv?: string; [key: string]: string | undefined; }
        let b2bRows: B2BRow[];

        if (preRows) {
          b2bRows = preRows;
        } else {
          let cleanData = data;
          if (cleanData.charCodeAt(0) === 0xFEFF) cleanData = cleanData.substring(1);

          const lines = cleanData.split(/\r?\n/).filter((l: string) => l.trim());
          if (lines.length < 2) break;

          const headers = lines[0].split(';').map((h: string) =>
            h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          );

          const findCol = (patterns: string[]): number => {
            for (const p of patterns) {
              const idx = headers.findIndex(h => h.includes(p));
              if (idx !== -1) return idx;
            }
            return -1;
          };

          const colMap: Record<string, number> = {
            ref: findCol(['reference', 'ref']),
            code: findCol(['code']),
            description: findCol(['longue description', 'description longue']),
            short_desc: findCol(['breve description', 'breve desc']),
            price: findCol(['prix', 'tarif']),
            pvp: findCol(['pvp']),
            tva: findCol(['tva']),
            brand: findCol(['marque']),
            category: findCol(['categorie']),
            subcategory: findCol(['sous-categorie', 'sous categorie']),
            tax_cop: findCol(['cop']),
            tax_d3e: findCol(['d3e']),
            umv_qty: findCol(['umv']),
            umv_ean: findCol(['ean umv', 'ean unite']),
            uve_qty: findCol(['uve']),
            uve_ean: findCol(['ean uve']),
            env_qty: findCol(['env']),
            env_ean: findCol(['ean env']),
            weight_umv: findCol(['poids umv']),
          };

          b2bRows = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';');
            if (cols.length < 5) continue;
            const row: B2BRow = {};
            for (const [key, idx] of Object.entries(colMap)) {
              if (idx >= 0 && idx < cols.length) row[key] = cols[idx]?.trim() || '';
            }
            if (!row.ref && !row.code) continue;
            b2bRows.push(row);
          }
        }

        const softSupplierId = await resolveSupplier(supabase, 'softcarrier');
        const tarifsCatalogSupplierId = await resolveSupplierByCode(supabase, 'SOFT');

        // Batch processing
        const TARIFSB2B_CHUNK = 50;
        for (let i = 0; i < b2bRows.length; i += TARIFSB2B_CHUNK) {
          const chunk = b2bRows.slice(i, i + TARIFSB2B_CHUNK);

          await Promise.allSettled(chunk.map(async (row) => {
            const ref = row.ref?.trim();
            const code = row.code?.trim();
            if (!ref && !code) { result.skipped++; return; }

            try {
              let prod = null;
              if (ref) {
                const { data: p } = await supabase
                  .from('products').select('id').eq('ref_softcarrier', ref).maybeSingle();
                prod = p;
              }
              if (!prod && code) {
                const { data: p } = await supabase
                  .from('products').select('id').eq('ref_b2b', code).maybeSingle();
                prod = p;
              }

              if (!prod) {
                result.skipped++;
                pushWarning(warningState, `TarifsB2B: ref ${ref || code} non trouvée`);
                return;
              }

              const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
              if (ref) updateData.ref_b2b = ref;
              if (code) updateData.code_b2b = parseInt(code) || null;
              if (row.short_desc) {
                updateData.name_short = row.short_desc.substring(0, 60);
              }
              if (row.description) {
                updateData.description = row.description;
              }
              if (row.brand) {
                updateData.brand = row.brand;
              }
              if (row.tva) {
                const tvaVal = parseNum(row.tva);
                if (tvaVal > 0) updateData.tva_rate = tvaVal;
              }
              if (row.weight_umv) {
                const wg = parseInt(row.weight_umv) || 0;
                if (wg > 0) updateData.weight_kg = wg / 1000;
              }

              // Category mapping for TarifsB2B
              if (softSupplierId && row.category) {
                const catName = cleanStr(row.category);
                const sousCatName = cleanStr(row.subcategory);
                if (catName) {
                  const catId = await resolveCategory(supabase, softSupplierId, catName, sousCatName);
                  if (catId) {
                    updateData.category_id = catId;
                  } else {
                    const { data: catByName } = await supabase
                      .from('categories').select('id')
                      .ilike('name', catName)
                      .eq('is_active', true).limit(1).maybeSingle();
                    if (catByName) {
                      await createUnverifiedMapping(supabase, softSupplierId, catName, sousCatName, catByName.id);
                      updateData.category_id = catByName.id;
                    }
                  }
                }
              }

              await withRetry(() => supabase.from('products').update(updateData).eq('id', prod.id));

              // Update supplier_offers with PVP and taxes
              const pvpVal = row.pvp ? parseNum(row.pvp) : 0;
              if (pvpVal > 0) {
                const taxBD: Record<string, number> = {};
                if (row.tax_cop) { const v = parseNum(row.tax_cop); if (v > 0) taxBD.COP = v; }
                if (row.tax_d3e) { const v = parseNum(row.tax_d3e); if (v > 0) taxBD.D3E = v; }
                try {
                  await supabase.from('supplier_offers')
                    .update({
                      pvp_ttc: pvpVal,
                      tax_breakdown: taxBD,
                      last_seen_at: new Date().toISOString(),
                      is_active: true,
                    })
                    .eq('supplier', 'SOFT')
                    .eq('product_id', prod.id);
                } catch (_) { /* non-bloquant */ }

                // Dual-write to supplier_catalog_items
                if (tarifsCatalogSupplierId && ref) {
                  try {
                    await supabase.from('supplier_catalog_items')
                      .update({
                        pvp_ttc: pvpVal,
                        tax_breakdown: taxBD,
                        last_seen_at: new Date().toISOString(),
                        is_active: true,
                      })
                      .eq('supplier_id', tarifsCatalogSupplierId)
                      .eq('supplier_sku', ref);
                  } catch (_) { /* non-bloquant */ }
                }
              }

              // Update price tiers
              if (row.pvp || row.tax_cop || row.tax_d3e) {
                const tierUpdate: Record<string, any> = {};
                if (row.pvp) tierUpdate.price_pvp = parseNum(row.pvp) || null;
                if (row.tax_cop) tierUpdate.tax_cop = parseNum(row.tax_cop);
                if (row.tax_d3e) tierUpdate.tax_d3e = parseNum(row.tax_d3e);

                if (Object.keys(tierUpdate).length > 0) {
                  await supabase.from('supplier_price_tiers')
                    .update(tierUpdate)
                    .eq('product_id', prod.id)
                    .eq('tier', 1);
                }
              }

              // Parse packagings
              await supabase.from('product_packagings').delete().eq('product_id', prod.id);
              const packagings: any[] = [];

              const addPkg = (type: string, qtyField: string, eanField: string) => {
                const qtyVal = row[qtyField];
                if (!qtyVal) return;
                const qty = parseInt(qtyVal) || 0;
                if (qty <= 0) return;
                packagings.push({
                  product_id: prod!.id,
                  packaging_type: type,
                  qty,
                  ean: row[eanField]?.trim() || null,
                  weight_gr: (type === 'UMV' && row.weight_umv) ? parseInt(row.weight_umv) || null : null,
                });
              };

              addPkg('UMV', 'umv_qty', 'umv_ean');
              addPkg('UVE', 'uve_qty', 'uve_ean');
              addPkg('ENV', 'env_qty', 'env_ean');

              if (packagings.length > 0) {
                await withRetry(() => supabase.from('product_packagings').insert(packagings));
              }

              result.success++;
            } catch (e: any) {
              addError(`TarifsB2B ${ref || code}: ${e.message}`);
            }
          }));
        }
        break;
      }

      // ───────────────────────────────────────────────
      // LAGERBESTAND.CSV — Stock temps réel (batched)
      // ───────────────────────────────────────────────
      case 'lagerbestand': {
        const fetchedAt = new Date().toISOString();

        // Support both raw text and pre-parsed rows
        let stockRows: Array<{ ref: string; qty_available: string; delivery_week: string }>;
        if (preRows) {
          stockRows = preRows;
        } else {
          const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
          const startIdx = (lines[0] && /^[a-zA-Z]/.test(lines[0].split(';')[0])) ? 1 : 0;
          stockRows = [];
          for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i].split(';');
            if (cols.length < 2) continue;
            const ref = cols[0]?.trim();
            if (!ref) continue;
            stockRows.push({
              ref,
              qty_available: cols[1]?.trim() || '0',
              delivery_week: cols[2]?.trim() || '',
            });
          }
        }

        const snapshots: any[] = [];
        for (const row of stockRows) {
          if (!row.ref) continue;
          snapshots.push({
            ref_softcarrier: row.ref,
            qty_available: parseInt(row.qty_available) || 0,
            delivery_week: row.delivery_week || null,
            fetched_at: fetchedAt,
          });
        }

        // Batch insert snapshots
        await flushBatch(supabase, 'supplier_stock_snapshots', snapshots, {
          warningState,
          label: 'stock_snapshots',
        });
        result.success = snapshots.length;

        // Batch update supplier_offers stock
        const STOCK_CHUNK = 50;
        for (let i = 0; i < snapshots.length; i += STOCK_CHUNK) {
          const chunk = snapshots.slice(i, i + STOCK_CHUNK);
          await Promise.allSettled(
            chunk.map(async (snap) => {
              try {
                await supabase.from('supplier_offers')
                  .update({ stock_qty: snap.qty_available, last_seen_at: fetchedAt })
                  .eq('supplier', 'SOFT')
                  .eq('supplier_product_id', snap.ref_softcarrier);
              } catch (_) { /* non-bloquant */ }
            })
          );
        }

        // Batch update supplier_catalog_items stock (dual-write)
        const lagerCatalogSupplierId = await resolveSupplierByCode(supabase, 'SOFT');
        if (lagerCatalogSupplierId) {
          for (let i = 0; i < snapshots.length; i += STOCK_CHUNK) {
            const chunk = snapshots.slice(i, i + STOCK_CHUNK);
            await Promise.allSettled(
              chunk.map(async (snap) => {
                try {
                  await supabase.from('supplier_catalog_items')
                    .update({ stock_qty: snap.qty_available, last_seen_at: fetchedAt })
                    .eq('supplier_id', lagerCatalogSupplierId)
                    .eq('supplier_sku', snap.ref_softcarrier);
                } catch (_) { /* non-bloquant */ }
              })
            );
          }
        }

        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Source inconnue: ${source}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Log import
    await logImport(supabase, `softcarrier-${source}`, result.success + result.errors + result.skipped, {
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      details: result.details,
    }, {
      supplier_id: softCatalogSupplierId,
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
