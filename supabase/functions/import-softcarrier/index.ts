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
  rateLimit: { prefix: "import-softcarrier", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin: supabase, body, corsHeaders }) => {
    const { source, data, dry_run = false } = body as Record<string, any>;
    if (!source || !data) {
      return jsonResponse({ error: 'Missing source or data' }, 400, corsHeaders);
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

    switch (source) {
      // ───────────────────────────────────────────────
      // HERSTINFO.TXT — Référentiel marques/fabricants
      // ───────────────────────────────────────────────
      case 'herstinfo': {
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const recordsBatch: any[] = [];

        for (const line of lines) {
          const cols = line.split('\t');
          const name = cols[0]?.trim();
          if (!name) continue;

          recordsBatch.push({
            name,
            company: cols[1]?.trim() || null,
            country: cols[4]?.trim() || null,
            website: cols[7]?.trim() || null,
            code: name.substring(0, 10).toUpperCase().replace(/\s+/g, '_'),
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
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const softOffersBatch: any[] = [];
        const catalogBatch: CatalogItemRow[] = [];
        const priceHistoryBatch: any[] = [];
        const softSupplierId = await resolveSupplier(supabase, 'softcarrier');
        const catalogSupplierId = await resolveSupplierByCode(supabase, 'SOFT');

        for (const line of lines) {
          const cols = line.split('\t');
          if (cols.length < 30) { result.skipped++; continue; }

          const ref = cols[2]?.trim();
          if (!ref || ref.length < 3) { result.skipped++; continue; }

          try {
            const descParts = [cols[4], cols[5], cols[6], cols[7], cols[8]]
              .map(c => c?.trim())
              .filter(Boolean);
            const description = descParts.join(' ').trim() || null;

            const priceHt = parseNum(cols[10]);
            const vatCode = parseInt(cols[37]) || 1;
            const vatRate = vatCode === 2 ? 1.055 : 1.20;
            const stockQty = parseInt(cols[36]) || 0;
            const isEndOfLife = cols[34]?.trim() === '1';

            const productData: Record<string, any> = {
              ref_softcarrier: ref,
              name: (cols[3]?.trim() || cols[27]?.trim() || [cols[27]?.trim(), ref].filter(Boolean).join(' ') || `Réf. ${ref || normalizeEan(cols[29]) || 'inconnue'}`).substring(0, 255),
              category: cols[0]?.trim() || 'Non classé',
              subcategory: cols[1]?.trim() || null,
              brand: cols[27]?.trim() || null,
              oem_ref: cols[28]?.trim() || null,
              ean: normalizeEan(cols[29]) || null,
              vat_code: vatCode,
              price: priceHt > 0 ? priceHt : 0.01,
              price_ht: priceHt,
              price_ttc: Math.round(priceHt * vatRate * 100) / 100,
              weight_kg: parseNum(cols[23]) || null,
              stock_quantity: stockQty,
              eco_tax: 0,
              is_end_of_life: isEndOfLife,
              is_special_order: cols[35]?.trim() === '1',
              country_origin: cols[32]?.trim() || null,
              updated_at: new Date().toISOString(),
            };

            if (description) productData.description = description;

            // Category mapping
            if (softSupplierId && productData.category !== 'Non classé') {
              const catId = await resolveCategory(supabase, softSupplierId, productData.category, productData.subcategory);
              if (catId) {
                productData.category_id = catId;
              } else {
                // Create unverified mapping suggestion
                const { data: catByName } = await supabase
                  .from('categories').select('id')
                  .ilike('name', productData.category)
                  .eq('is_active', true).limit(1).maybeSingle();
                if (catByName) {
                  await createUnverifiedMapping(supabase, softSupplierId, productData.category, productData.subcategory, catByName.id);
                  productData.category_id = catByName.id;
                }
              }
            }

            // Fallback EAN: link existing product by EAN if no ref_softcarrier
            let productId: string;
            const eanNormalized = normalizeEan(cols[29]);
            let foundByEan = false;

            if (eanNormalized) {
              const { data: byEan } = await supabase
                .from('products')
                .select('id, ref_softcarrier')
                .eq('ean', eanNormalized)
                .maybeSingle();

              if (byEan && !byEan.ref_softcarrier) {
                // Don't overwrite good existing data with empty Softcarrier data
                const updateData = { ref_softcarrier: ref, ...productData };
                if (updateData.name && (updateData.name === 'Sans nom' || updateData.name.startsWith('Réf. ') || updateData.name === ref)) {
                  delete updateData.name;
                }
                if (!updateData.brand) delete updateData.brand;
                if (updateData.category === 'Non classé') delete updateData.category;

                // Merge attributs: preserve existing supplier refs
                const { data: currentProd } = await supabase
                  .from('products').select('attributs').eq('id', byEan.id).single();
                if (currentProd?.attributs && typeof currentProd.attributs === 'object' && updateData.attributs) {
                  updateData.attributs = { ...currentProd.attributs, ...updateData.attributs };
                }

                await withRetry(() => supabase.from('products')
                  .update(updateData)
                  .eq('id', byEan.id));
                productId = byEan.id;
                foundByEan = true;
                result.updated++;
              } else if (byEan && byEan.ref_softcarrier === ref) {
                productId = byEan.id;
                foundByEan = true;
              }
            }

            if (!foundByEan) {
              // Track price changes
              const { data: existingProd } = await supabase
                .from('products')
                .select('id, price_ht, price_ttc, cost_price')
                .eq('ref_softcarrier', ref)
                .maybeSingle();

              if (existingProd) {
                const priceEntry = buildPriceHistoryEntry(
                  existingProd.id, 'import-softcarrier-preislis', softSupplierId,
                  existingProd, { price_ht: productData.price_ht, price_ttc: productData.price_ttc, cost_price: priceHt > 0 ? priceHt : null },
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
              const qtyIdx = 9 + (t * 2);
              const priceIdx = 10 + (t * 2);
              const qty = parseInt(cols[qtyIdx]) || 0;
              const price = parseNum(cols[priceIdx]);
              if (qty > 0 && price > 0) {
                tiers.push({
                  product_id: productId,
                  tier: t + 1,
                  min_qty: qty,
                  price_ht: price,
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
              purchase_price_ht: priceHt > 0 ? priceHt : null,
              pvp_ttc: null,
              vat_rate: vatCode === 2 ? 5.5 : 20,
              tax_breakdown: {},
              stock_qty: stockQty,
              min_qty: parseInt(cols[22]) || 1,
              is_active: !isEndOfLife,
              last_seen_at: new Date().toISOString(),
            });

            // Collect supplier_catalog_items (dual-write)
            if (catalogSupplierId) {
              catalogBatch.push({
                supplier_id: catalogSupplierId,
                product_id: productId,
                supplier_sku: ref,
                supplier_ean: normalizeEan(cols[29]) || null,
                supplier_product_name: productData.name,
                supplier_family: productData.category !== 'Non classé' ? productData.category : null,
                supplier_subfamily: productData.subcategory || null,
                purchase_price_ht: priceHt > 0 ? priceHt : null,
                pvp_ttc: null,
                vat_rate: vatCode === 2 ? 5.5 : 20,
                tax_breakdown: {},
                stock_qty: stockQty,
                min_order_qty: parseInt(cols[22]) || 1,
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
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const updateBatch: Array<{ ref: string; description: string }> = [];

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

        // Batch update descriptions in chunks of 50
        const ARTX_CHUNK = 50;
        for (let i = 0; i < updateBatch.length; i += ARTX_CHUNK) {
          const chunk = updateBatch.slice(i, i + ARTX_CHUNK);
          await Promise.allSettled(
            chunk.map(async ({ ref, description }) => {
              try {
                await withRetry(() =>
                  supabase.from('products')
                    .update({ description, updated_at: new Date().toISOString() })
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
        let cleanData = data;
        if (cleanData.charCodeAt(0) === 0xFEFF) cleanData = cleanData.substring(1);

        const lines = cleanData.split(/\r?\n/).filter((l: string) => l.trim());
        if (lines.length < 2) break;

        // Dynamic header detection
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

        const colRef = findCol(['reference', 'ref']);
        const colCode = findCol(['code']);
        const colDesc = findCol(['longue description', 'description longue']);
        const colDescCourte = findCol(['breve description', 'breve desc']);
        const colPrix = findCol(['prix', 'tarif']);
        const colPvp = findCol(['pvp']);
        const colTva = findCol(['tva']);
        const colMarque = findCol(['marque']);
        const colCategorie = findCol(['categorie']);
        const colSousCategorie = findCol(['sous-categorie', 'sous categorie']);
        const colTaxeCop = findCol(['cop']);
        const colTaxeD3e = findCol(['d3e']);
        const colUmvQty = findCol(['umv']);
        const colUmvEan = findCol(['ean umv', 'ean unite']);
        const colUveQty = findCol(['uve']);
        const colUveEan = findCol(['ean uve']);
        const colEnvQty = findCol(['env']);
        const colEnvEan = findCol(['ean env']);
        const colPoidsUmv = findCol(['poids umv']);

        const softSupplierId = await resolveSupplier(supabase, 'softcarrier');
        const tarifsCatalogSupplierId = await resolveSupplierByCode(supabase, 'SOFT');

        // Batch processing
        const TARIFSB2B_CHUNK = 50;
        for (let i = 1; i < lines.length; i += TARIFSB2B_CHUNK) {
          const chunk = lines.slice(i, i + TARIFSB2B_CHUNK);

          await Promise.allSettled(chunk.map(async (line) => {
            const cols = line.split(';');
            if (cols.length < 5) return;

            const ref = colRef >= 0 ? cols[colRef]?.trim() : cols[1]?.trim();
            const code = colCode >= 0 ? cols[colCode]?.trim() : cols[0]?.trim();
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
              if (colDescCourte >= 0 && cols[colDescCourte]?.trim()) {
                updateData.name_short = cols[colDescCourte].trim().substring(0, 60);
              }
              if (colDesc >= 0 && cols[colDesc]?.trim()) {
                updateData.description = cols[colDesc].trim();
              }
              if (colMarque >= 0 && cols[colMarque]?.trim()) {
                updateData.brand = cols[colMarque].trim();
              }
              if (colTva >= 0) {
                const tvaVal = parseNum(cols[colTva]);
                if (tvaVal > 0) updateData.tva_rate = tvaVal;
              }
              if (colPoidsUmv >= 0) {
                const wg = parseInt(cols[colPoidsUmv]) || 0;
                if (wg > 0) updateData.weight_kg = wg / 1000;
              }

              // Category mapping for TarifsB2B
              if (softSupplierId && colCategorie >= 0) {
                const catName = cleanStr(cols[colCategorie]);
                const sousCatName = colSousCategorie >= 0 ? cleanStr(cols[colSousCategorie]) : null;
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
              const pvpVal = colPvp >= 0 ? parseNum(cols[colPvp]) : 0;
              if (pvpVal > 0) {
                const taxBD: Record<string, number> = {};
                if (colTaxeCop >= 0) { const v = parseNum(cols[colTaxeCop]); if (v > 0) taxBD.COP = v; }
                if (colTaxeD3e >= 0) { const v = parseNum(cols[colTaxeD3e]); if (v > 0) taxBD.D3E = v; }
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
              if (colPvp >= 0 || colTaxeCop >= 0 || colTaxeD3e >= 0) {
                const tierUpdate: Record<string, any> = {};
                if (colPvp >= 0) tierUpdate.price_pvp = parseNum(cols[colPvp]) || null;
                if (colTaxeCop >= 0) tierUpdate.tax_cop = parseNum(cols[colTaxeCop]);
                if (colTaxeD3e >= 0) tierUpdate.tax_d3e = parseNum(cols[colTaxeD3e]);

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

              const addPkg = (type: string, qtyIdx: number, eanIdx: number) => {
                if (qtyIdx < 0 || qtyIdx >= cols.length) return;
                const qty = parseInt(cols[qtyIdx]) || 0;
                if (qty <= 0) return;
                packagings.push({
                  product_id: prod!.id,
                  packaging_type: type,
                  qty,
                  ean: (eanIdx >= 0 && eanIdx < cols.length) ? cols[eanIdx]?.trim() || null : null,
                  weight_gr: (colPoidsUmv >= 0 && type === 'UMV') ? parseInt(cols[colPoidsUmv]) || null : null,
                });
              };

              addPkg('UMV', colUmvQty, colUmvEan);
              addPkg('UVE', colUveQty, colUveEan);
              addPkg('ENV', colEnvQty, colEnvEan);

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
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const fetchedAt = new Date().toISOString();

        const startIdx = (lines[0] && /^[a-zA-Z]/.test(lines[0].split(';')[0])) ? 1 : 0;

        const snapshots: any[] = [];
        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(';');
          if (cols.length < 2) continue;
          const ref = cols[0]?.trim();
          if (!ref) continue;

          snapshots.push({
            ref_softcarrier: ref,
            qty_available: parseInt(cols[1]) || 0,
            delivery_week: cols[2]?.trim() || null,
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
