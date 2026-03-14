import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { normalizeEan } from "../_shared/normalize-ean.ts";
import {
  parseNum,
  cleanStr,
  resolveSupplier,
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
  type WarningState,
  type FlushBatchOptions,
  type FlushBatchStats,
} from "../_shared/import-helpers.ts";

interface ComlandiRow {
  code?: string;
  reference?: string;
  categorie?: string;
  sous_categorie?: string;
  description?: string;
  prix?: string;
  tarif?: string;
  pvp_conseille?: string;
  tva?: string;
  taxe_cop?: string;
  taxe_d3e?: string;
  taxe_mob?: string;
  taxe_scm?: string;
  taxe_sod?: string;
  umv?: string;
  uve?: string;
  env?: string;
  emb?: string;
  palette?: string;
  ean_umv?: string;
  ean_unite?: string;
  ean_uve?: string;
  ean_env?: string;
  ean_emb?: string;
  ean_palette?: string;
  indisponible?: string;
  description_breve?: string;
  description_longue?: string;
  marque?: string;
  poids_umv?: string;
  poids_uve?: string;
  poids_env?: string;
  poids_emb?: string;
  umv_dim?: string;
  env_dim?: string;
  emb_dim?: string;
  palette_dim?: string;
  code_douane?: string;
  pays_origine?: string;
}

// Liderpapel merged row (Catalog + Prices + Stock)
interface LiderpapelRow {
  reference?: string;
  description?: string;
  family?: string;
  subfamily?: string;
  ean?: string;
  brand?: string;
  cost_price?: string;      // prix d'achat HT
  suggested_price?: string;  // prix conseillé TTC
  tva_rate?: string;
  taxe_cop?: string;
  taxe_d3e?: string;
  taxe_mob?: string;
  taxe_scm?: string;
  taxe_sod?: string;
  stock_quantity?: string;
  weight_kg?: string;
  dimensions?: string;
  country_origin?: string;
  customs_code?: string;
  is_active?: string;
}

// Local types and helpers removed — now using shared imports from _shared/import-helpers.ts

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'import-comlandi');
  if (!(await checkRateLimit(rlKey, 200, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Reject oversized payloads (max 50MB)
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > 50 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Payload trop volumineux (max 50 MB)' }), {
      status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Accept service role key (internal calls from fetch-liderpapel-sftp) or admin JWT (browser)
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const isServiceCall = token === serviceKey && serviceKey.length > 0;
  if (!isServiceCall) {
    const authResult = await requireAdmin(req, corsHeaders);
    if (isAuthError(authResult)) return authResult.error;
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const source: string = body.source || 'comlandi';

    if (source === 'liderpapel') {
      return await handleLiderpapel(supabase, body, corsHeaders);
    }

    // ─── Original Comlandi logic ───
    const { rows, mode, dry_run = false } = body as { rows: ComlandiRow[]; mode: 'create' | 'enrich'; dry_run?: boolean };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No rows provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── Dry-run mode ──
    if (dry_run) {
      const dryResult = createDryRunResult();
      for (const row of rows) {
        const ean = normalizeEan(row.ean_unite) || normalizeEan(row.ean_umv);
        const ref = cleanStr(row.reference) || cleanStr(row.code);
        if (!ref && !ean) { dryResult.would_skip++; continue; }
        if (row.indisponible && row.indisponible.trim() !== '') { dryResult.would_skip++; continue; }

        const name = cleanStr(row.description) || cleanStr(row.description_breve) || 'Sans nom';
        try {
          if (ean) {
            const { data: existing } = await supabase
              .from('products').select('id').eq('ean', ean).maybeSingle();
            if (existing) {
              dryResult.would_update++;
              if (dryResult.sample_updates.length < 10) {
                dryResult.sample_updates.push({ ean, name, ref, changes: ['price', 'category'] });
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[] };
    const warningState = createWarningState();

    // Accumulator batches for bulk inserts at end
    const priceHistoryBatch: any[] = [];
    const lifecycleLogsBatch: any[] = [];
    const attributesBatch: any[] = [];
    const supplierOffersBatch: any[] = [];

    // Resolve Comlandi supplier ID once
    let comlandiSupplierId: string | null = null;
    try {
      const { data: supplierRow } = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', '%comlandi%')
        .limit(1)
        .maybeSingle();
      if (supplierRow) comlandiSupplierId = supplierRow.id;
    } catch (_) { /* ignore */ }

    const BATCH = 50;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);

      for (const row of batch) {
        const ean = normalizeEan(row.ean_unite) || normalizeEan(row.ean_umv);
        const ref = cleanStr(row.reference) || cleanStr(row.code);
        if (!ref && !ean) { result.skipped++; continue; }

        if (row.indisponible && row.indisponible.trim() !== '') { result.skipped++; continue; }

        const prixHT = parseNum(row.prix);
        const tvaRate = parseNum(row.tva) || 20;
        const prixTTC = prixHT > 0 ? Math.round(prixHT * (1 + tvaRate / 100) * 100) / 100 : 0;

        const ecoTax = parseNum(row.taxe_cop) + parseNum(row.taxe_d3e) + parseNum(row.taxe_mob) + parseNum(row.taxe_scm) + parseNum(row.taxe_sod);

        const name = cleanStr(row.description) || cleanStr(row.description_breve) || 'Sans nom';
        const description = cleanStr(row.description_longue) || cleanStr(row.description_breve) || '';

        // Résolution catégorie via mapping fournisseur
        const catFournisseur = cleanStr(row.categorie);
        const sousCatFournisseur = cleanStr(row.sous_categorie);
        let categoryId: string | null = null;
        if (comlandiSupplierId && catFournisseur) {
          categoryId = await resolveCategory(supabase, comlandiSupplierId, catFournisseur, sousCatFournisseur);
        }

        const productData: Record<string, any> = {
          name: name.substring(0, 255),
          name_short: cleanStr(row.description_breve)?.substring(0, 60) || null,
          description: description || null,
          category: cleanStr(row.categorie) || 'Non classé',
          subcategory: cleanStr(row.sous_categorie) || null,
          ...(categoryId ? { category_id: categoryId } : {}),
          brand: cleanStr(row.marque) || null,
          price: prixTTC || 0.01,
          price_ht: prixHT || 0,
          price_ttc: prixTTC || 0,
          tva_rate: tvaRate,
          eco_tax: ecoTax > 0 ? ecoTax : null,
          customs_code: cleanStr(row.code_douane) || null,
          country_origin: cleanStr(row.pays_origine) || null,
          dimensions_cm: cleanStr(row.umv_dim) || null,
          weight_kg: parseNum(row.poids_umv) > 0 ? Math.round(parseNum(row.poids_umv) / 10) / 100 : null,
          is_active: true,
          is_end_of_life: false,
          updated_at: new Date().toISOString(),
          attributs: {
            source: 'comlandi',
            ref_comlandi: ref,
            code_comlandi: cleanStr(row.code),
            tarif: cleanStr(row.tarif),
            pvp_conseille: parseNum(row.pvp_conseille) || null,
            umv: cleanStr(row.umv),
            uve: cleanStr(row.uve),
            env: cleanStr(row.env),
            emb: cleanStr(row.emb),
            ean_uve: cleanStr(row.ean_uve),
            ean_env: cleanStr(row.ean_env),
            ean_emb: cleanStr(row.ean_emb),
            ean_palette: cleanStr(row.ean_palette),
            env_dim: cleanStr(row.env_dim),
            emb_dim: cleanStr(row.emb_dim),
            palette_dim: cleanStr(row.palette_dim),
            poids_uve_gr: parseNum(row.poids_uve) || null,
            poids_env_gr: parseNum(row.poids_env) || null,
            poids_emb_gr: parseNum(row.poids_emb) || null,
          },
        };

        try {
          let savedProductId: string | null = null;
          let isNew = false;

          if (ean) {
            // Use .limit(1) to avoid PGRST116 when multiple products share the same EAN
            const { data: existingArr } = await supabase
              .from('products')
              .select('id, price_ht, price_ttc, cost_price')
              .eq('ean', ean)
              .limit(1);
            const existing = existingArr?.[0] ?? null;

            if (existing) {
              // T4.1 — Track price changes before update
              const priceEntry = buildPriceHistoryEntry(
                existing.id, 'import-comlandi', comlandiSupplierId,
                existing, { price_ht: prixHT, price_ttc: prixTTC, cost_price: prixHT || null },
                'import-comlandi-catalogue',
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

          // ── supplier_offers upsert (COMLANDI) ──
          if (savedProductId) {
            const pvp = parseNum(row.pvp_conseille) || null;
            const taxBreakdown: Record<string, number> = {};
            if (parseNum(row.taxe_d3e) > 0) taxBreakdown.D3E = parseNum(row.taxe_d3e);
            if (parseNum(row.taxe_cop) > 0) taxBreakdown.COP = parseNum(row.taxe_cop);
            if (parseNum(row.taxe_mob) > 0) taxBreakdown.MOB = parseNum(row.taxe_mob);
            if (parseNum(row.taxe_scm) > 0) taxBreakdown.SCM = parseNum(row.taxe_scm);
            if (parseNum(row.taxe_sod) > 0) taxBreakdown.SOD = parseNum(row.taxe_sod);
            supplierOffersBatch.push({
              product_id: savedProductId,
              supplier: 'COMLANDI',
              supplier_product_id: ref || ean || savedProductId,
              purchase_price_ht: prixHT > 0 ? prixHT : null,
              pvp_ttc: pvp,
              vat_rate: tvaRate,
              tax_breakdown: taxBreakdown,
              stock_qty: 0,
              is_active: true,
              last_seen_at: new Date().toISOString(),
            });
          }

          // T2.1 — Collect product_attributes (marque, dimensions)
          if (savedProductId) {
            const marque = cleanStr(row.marque);
            if (marque) {
              attributesBatch.push({
                product_id: savedProductId,
                attribute_type: 'marque',
                attribute_name: 'Marque',
                attribute_value: marque,
                source: 'comlandi',
              });
            }
            const dim = cleanStr(row.umv_dim);
            if (dim) {
              attributesBatch.push({
                product_id: savedProductId,
                attribute_type: 'dimensions',
                attribute_name: 'Dimensions UMV',
                attribute_value: dim,
                source: 'comlandi',
              });
            }

            // T9.1 — Collect lifecycle log
            lifecycleLogsBatch.push({
              product_id: savedProductId,
              event_type: isNew ? 'created' : 'updated',
              performed_by: 'import-comlandi',
              details: { ref, ean, source: 'comlandi' },
            });
          }

          // Upsert into supplier_products — always, even if prixHT = 0
          if (savedProductId && comlandiSupplierId) {
            const spPrice = prixHT > 0 ? prixHT : 0.01; // supplier_price NOT NULL
            await supabase.from('supplier_products').upsert({
              supplier_id: comlandiSupplierId,
              product_id: savedProductId,
              supplier_reference: ref || null,
              supplier_price: spPrice,
              stock_quantity: 0,
              source_type: 'comlandi',
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

    // T4.1 — Flush price history
    const priceHistoryFlush = await flushBatch(supabase, 'product_price_history', priceHistoryBatch, {
      warningState,
      label: 'product_price_history',
    });

    // T9.1 — Flush lifecycle logs
    const lifecycleFlush = await flushBatch(supabase, 'product_lifecycle_logs', lifecycleLogsBatch, {
      warningState,
      label: 'product_lifecycle_logs',
    });

    // T2.1 — Flush attributes
    const attributesFlush = await flushBatch(supabase, 'product_attributes', attributesBatch, {
      warningState,
      label: 'product_attributes',
    });

    // ── Flush supplier_offers (COMLANDI) ──
    const supplierOffersFlush = await flushBatch(supabase, 'supplier_offers', supplierOffersBatch, {
      onConflict: 'supplier,supplier_product_id',
      ignoreDuplicates: false,
      warningState,
      label: 'supplier_offers',
    });

    const flushReport = {
      product_price_history: priceHistoryFlush,
      product_lifecycle_logs: lifecycleFlush,
      product_attributes: attributesFlush,
      supplier_offers: supplierOffersFlush,
    };

    // Désactiver les offres COMLANDI fantômes — seuil dynamique depuis app_settings
    try {
      const { data: ghostSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ghost_offer_threshold_comlandi_days')
        .maybeSingle();
      const ghostDays = Number(ghostSetting?.value ?? 7);
      await supabase.from('supplier_offers')
        .update({ is_active: false })
        .eq('supplier', 'COMLANDI')
        .eq('is_active', true)
        .lt('last_seen_at', new Date(Date.now() - ghostDays * 24 * 60 * 60 * 1000).toISOString());
    } catch (_) { /* ignore */ }

    // Batch recompute des produits touchés
    const uniqueProductIds = [...new Set(supplierOffersBatch.map((o: any) => o.product_id))];
    await batchRecomputeRollups(supabase, uniqueProductIds);

    // T8.1 — Log the import with enriched counts
    await logImport(supabase, 'comlandi-catalogue', rows.length, result, {
      price_changes_count: priceHistoryBatch.length,
      report_data: {
        warnings_count: warningState.total,
        warnings: warningState.list,
        flush_stats: flushReport,
      },
    });

    return new Response(JSON.stringify({
      ...result,
      warnings_count: warningState.total,
      warnings: warningState.list,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'import Comlandi' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ─── Liderpapel import handler ───

async function handleLiderpapel(supabase: any, body: any, corsHeaders: Record<string, string>) {
  const { rows } = body as { rows: LiderpapelRow[] };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return new Response(JSON.stringify({ error: 'No Liderpapel rows provided' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Load coefficients table
  const { data: coefficients } = await supabase
    .from('liderpapel_pricing_coefficients')
    .select('family, subfamily, coefficient');

  const coeffMap = new Map<string, number>();
  for (const c of (coefficients || [])) {
    const key = c.subfamily ? `${c.family}::${c.subfamily}` : `${c.family}::`;
    coeffMap.set(key, c.coefficient);
  }

  function getCoefficient(family?: string, subfamily?: string): number {
    if (!family) return 2.0;
    if (subfamily) {
      const specific = coeffMap.get(`${family}::${subfamily}`);
      if (specific !== undefined) return specific;
    }
    const familyLevel = coeffMap.get(`${family}::`);
    if (familyLevel !== undefined) return familyLevel;
    return 2.0;
  }

  const result = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[], price_changes: [] as any[] };
  const warningState = createWarningState();

  // Accumulator batches
  const priceHistoryBatch: any[] = [];
  const lifecycleLogsBatch: any[] = [];
  const attributesBatch: any[] = [];
  const supplierOffersBatch: any[] = [];

  // Resolve CS Group supplier ID
  let liderpapelSupplierId: string | null = null;
  try {
    const { data: supplierRow } = await supabase
      .from('suppliers')
      .select('id')
      .or('name.ilike.%comlandi%,name.ilike.%liderpapel%,name.ilike.%cs group%')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (supplierRow) liderpapelSupplierId = supplierRow.id;
  } catch (_) { /* ignore */ }

  // Auto-create supplier if not found — ensures supplier_products linking always works
  if (!liderpapelSupplierId) {
    try {
      const { data: created } = await supabase
        .from('suppliers')
        .insert({ name: 'Comlandi (Liderpapel)', is_active: true, code: 'COMLANDI' })
        .select('id')
        .single();
      if (created) liderpapelSupplierId = created.id;
    } catch (_) { /* may already exist with different name pattern */ }
  }

  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    for (const row of batch) {
      const ref = cleanStr(row.reference);
      const ean = normalizeEan(row.ean);
      if (!ref && !ean) { result.skipped++; continue; }

      try {
        const costPrice = parseNum(row.cost_price);
        const tvaRate = parseNum(row.tva_rate) || 20;
        const suggestedPrice = parseNum(row.suggested_price);

        let priceHT: number;
        let priceTTC: number;

        if (suggestedPrice > 0) {
          priceTTC = suggestedPrice;
          priceHT = Math.round(priceTTC / (1 + tvaRate / 100) * 100) / 100;
        } else if (costPrice > 0) {
          const coeff = getCoefficient(cleanStr(row.family) || undefined, cleanStr(row.subfamily) || undefined);
          priceHT = Math.round(costPrice * coeff * 100) / 100;
          priceTTC = Math.round(priceHT * (1 + tvaRate / 100) * 100) / 100;
        } else {
          result.skipped++;
          continue;
        }

        const ecoTax = parseNum(row.taxe_cop) + parseNum(row.taxe_d3e) + parseNum(row.taxe_mob) + parseNum(row.taxe_scm) + parseNum(row.taxe_sod);
        const finalPriceTTC = Math.round((priceTTC + ecoTax) * 100) / 100;

        const productData: Record<string, any> = {
          name: (cleanStr(row.description) || [cleanStr(row.brand), ref].filter(Boolean).join(' ') || `Réf. ${ref || ean || 'inconnue'}`).substring(0, 255),
          category: cleanStr(row.family) || 'Non classé',
          subcategory: cleanStr(row.subfamily) || null,
          family: cleanStr(row.family) || null,
          subfamily: cleanStr(row.subfamily) || null,
          brand: cleanStr(row.brand) || null,
          cost_price: costPrice > 0 ? costPrice : null,
          price_ht: priceHT,
          price_ttc: finalPriceTTC,
          price: finalPriceTTC,
          tva_rate: tvaRate,
          eco_tax: ecoTax > 0 ? ecoTax : null,
          weight_kg: parseNum(row.weight_kg) > 0 ? parseNum(row.weight_kg) : null,
          dimensions_cm: cleanStr(row.dimensions) || null,
          country_origin: cleanStr(row.country_origin) || null,
          customs_code: cleanStr(row.customs_code) || null,
          is_active: row.is_active !== '0' && row.is_active !== 'false',
          is_end_of_life: false,
          updated_at: new Date().toISOString(),
          attributs: {
            source: 'liderpapel',
            ref_liderpapel: ref,
            suggested_price_original: suggestedPrice || null,
            cost_price_original: costPrice || null,
          },
        };

        if (parseNum(row.stock_quantity) >= 0 && row.stock_quantity !== undefined && row.stock_quantity !== '') {
          productData.stock_quantity = Math.floor(parseNum(row.stock_quantity));
        }

        // Résolution category_id via mapping fournisseur
        const catFamily = cleanStr(row.family);
        const catSubfamily = cleanStr(row.subfamily);
        if (liderpapelSupplierId && catFamily) {
          let categoryId = await resolveCategory(supabase, liderpapelSupplierId, catFamily, catSubfamily);
          if (!categoryId) {
            // Fallback: chercher par nom dans la table categories
            const { data: catByName } = await supabase
              .from('categories')
              .select('id')
              .ilike('name', catFamily)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            if (catByName?.id) {
              categoryId = catByName.id;
              await createUnverifiedMapping(supabase, liderpapelSupplierId, catFamily, catSubfamily, categoryId);
            }
          }
          if (categoryId) productData.category_id = categoryId;
        }

        let existingId: string | null = null;
        let oldPrices: { price_ht: number | null; price_ttc: number | null; cost_price: number | null } | null = null;

        if (ean) {
          // Use .limit(1) to avoid PGRST116 when multiple products share the same EAN
          const { data: byEanArr } = await supabase
            .from('products')
            .select('id, price_ht, price_ttc, cost_price')
            .eq('ean', ean)
            .limit(1);
          const byEan = byEanArr?.[0] ?? null;
          if (byEan) { existingId = byEan.id; oldPrices = byEan; }
        }

        if (!existingId && ref) {
          const { data: byRef } = await supabase
            .from('products')
            .select('id, price_ht, price_ttc, cost_price')
            .eq('attributs->>ref_liderpapel', ref)
            .maybeSingle();
          if (byRef) { existingId = byRef.id; oldPrices = byRef; }
        }

        let savedProductId: string | null = existingId;
        let isNew = false;

        if (existingId) {
          // Don't overwrite a good existing name/category with empty Liderpapel data.
          // The Catalog.json often has empty descriptions — real names come from
          // the Descriptions_fr enrichment file processed later.
          if (!cleanStr(row.description)) delete productData.name;
          if (!cleanStr(row.brand)) delete productData.brand;
          if (!cleanStr(row.family) || productData.category === 'Non classé') {
            delete productData.category;
            delete productData.family;
          }
          if (!cleanStr(row.subfamily)) {
            delete productData.subcategory;
            delete productData.subfamily;
          }

          // T4.1 — Track price changes
          if (oldPrices) {
            const priceEntry = buildPriceHistoryEntry(
              existingId!, 'import-liderpapel', liderpapelSupplierId,
              oldPrices, { price_ht: priceHT, price_ttc: finalPriceTTC, cost_price: costPrice > 0 ? costPrice : null },
              'import-liderpapel-catalogue',
            );
            if (priceEntry) {
              priceHistoryBatch.push(priceEntry);
              result.price_changes.push({ ref, ean, old_ht: oldPrices.price_ht, new_ht: priceHT });
            }
          }

          const { error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', existingId);
          if (error) throw error;
          result.updated++;
        } else {
          productData.ean = ean || null;
          const { data: inserted, error } = await supabase
            .from('products')
            .insert(productData)
            .select('id')
            .single();
          if (error) throw error;
          savedProductId = inserted?.id || null;
          isNew = true;
          result.created++;
        }

        // T2.1 — Collect product_attributes
        if (savedProductId) {
          const brand = cleanStr(row.brand);
          if (brand) {
            attributesBatch.push({
              product_id: savedProductId,
              attribute_type: 'marque',
              attribute_name: 'Marque',
              attribute_value: brand,
              source: 'liderpapel',
            });
          }

          // T9.1 — Lifecycle log
          lifecycleLogsBatch.push({
            product_id: savedProductId,
            event_type: isNew ? 'created' : 'updated',
            performed_by: 'import-liderpapel',
            details: { ref, ean, source: 'liderpapel' },
          });
        }

        // Upsert into supplier_products
        if (savedProductId && liderpapelSupplierId) {
          const spPrice = costPrice > 0 ? costPrice : 0.01;
          const stockQty = Math.floor(parseNum(row.stock_quantity)) > 0
            ? Math.floor(parseNum(row.stock_quantity))
            : (productData.stock_quantity ?? 0);
          await supabase.from('supplier_products').upsert({
            supplier_id: liderpapelSupplierId,
            product_id: savedProductId,
            supplier_reference: ref || null,
            supplier_price: spPrice,
            stock_quantity: stockQty,
            source_type: 'liderpapel',
            is_preferred: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'supplier_id,product_id' });
        }

        // ── supplier_offers upsert (Liderpapel/COMLANDI) ──
        if (savedProductId) {
          const stockQty = Math.floor(parseNum(row.stock_quantity)) || 0;
          const taxBreakdown: Record<string, number> = {};
          if (parseNum(row.taxe_d3e) > 0) taxBreakdown.D3E = parseNum(row.taxe_d3e);
          if (parseNum(row.taxe_cop) > 0) taxBreakdown.COP = parseNum(row.taxe_cop);
          if (parseNum(row.taxe_mob) > 0) taxBreakdown.MOB = parseNum(row.taxe_mob);
          if (parseNum(row.taxe_scm) > 0) taxBreakdown.SCM = parseNum(row.taxe_scm);
          if (parseNum(row.taxe_sod) > 0) taxBreakdown.SOD = parseNum(row.taxe_sod);
          supplierOffersBatch.push({
            product_id: savedProductId,
            supplier: 'COMLANDI',
            supplier_product_id: ref || ean || savedProductId,
            purchase_price_ht: costPrice > 0 ? costPrice : null,
            pvp_ttc: suggestedPrice > 0 ? suggestedPrice : null,
            vat_rate: tvaRate,
            tax_breakdown: taxBreakdown,
            stock_qty: stockQty,
            min_qty: 1,
            is_active: true,
            last_seen_at: new Date().toISOString(),
          });
        }
      } catch (e: any) {
        result.errors++;
        if (result.details.length < 30) {
          result.details.push(`${ref || ean}: ${e.message}`);
        }
      }
    }
  }

  // T4.1 — Flush price history
  const priceHistoryFlush = await flushBatch(supabase, 'product_price_history', priceHistoryBatch, {
    warningState,
    label: 'product_price_history',
  });

  // T9.1 — Flush lifecycle logs
  const lifecycleFlush = await flushBatch(supabase, 'product_lifecycle_logs', lifecycleLogsBatch, {
    warningState,
    label: 'product_lifecycle_logs',
  });

  // T2.1 — Flush attributes
  const attributesFlush = await flushBatch(supabase, 'product_attributes', attributesBatch, {
    warningState,
    label: 'product_attributes',
  });

  // ── Flush supplier_offers (Liderpapel/COMLANDI) ──
  const supplierOffersFlush = await flushBatch(supabase, 'supplier_offers', supplierOffersBatch, {
    onConflict: 'supplier,supplier_product_id',
    ignoreDuplicates: false,
    warningState,
    label: 'supplier_offers',
  });

  const flushReport = {
    product_price_history: priceHistoryFlush,
    product_lifecycle_logs: lifecycleFlush,
    product_attributes: attributesFlush,
    supplier_offers: supplierOffersFlush,
  };

  // Désactiver les offres COMLANDI fantômes — seuil dynamique depuis app_settings
  try {
    const { data: ghostSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ghost_offer_threshold_comlandi_days')
      .maybeSingle();
    const ghostDays = Number(ghostSetting?.value ?? 7);
    await supabase.from('supplier_offers')
      .update({ is_active: false })
      .eq('supplier', 'COMLANDI')
      .eq('is_active', true)
      .lt('last_seen_at', new Date(Date.now() - ghostDays * 24 * 60 * 60 * 1000).toISOString());
  } catch (_) { /* ignore */ }

  // Batch recompute des produits touchés
  const uniqueProductIds = [...new Set(supplierOffersBatch.map((o: any) => o.product_id))];
  await batchRecomputeRollups(supabase, uniqueProductIds);

  // T8.1 — Log the import with enriched counts
  await logImport(supabase, 'liderpapel-catalogue', rows.length, result, {
    price_changes_count: priceHistoryBatch.length,
    report_data: {
      warnings_count: warningState.total,
      warnings: warningState.list,
      flush_stats: flushReport,
    },
  });

  return new Response(JSON.stringify({
    ...result,
    price_changes_count: priceHistoryBatch.length,
    flush_stats: flushReport,
    warnings_count: warningState.total,
    warnings: warningState.list,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
