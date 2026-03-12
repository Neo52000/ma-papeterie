import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { normalizeEan } from "../_shared/normalize-ean.ts";
import {
  cleanStr,
  resolveSupplier,
  batchEanLookup,
  flushBatch,
  createWarningState,
  deactivateGhostOffers,
  batchRecomputeRollups,
  logImport,
  resolveCategory,
  createUnverifiedMapping,
  createDryRunResult,
  type DryRunResult,
  type WarningState,
} from "../_shared/import-helpers.ts";

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
  enrichment?: {
    weight?: string | null;
    weight_unit?: string | null;
    dimensions?: string | null;
    material?: string | null;
    color?: string | null;
    conditioning?: string | null;
    unit_of_sale?: string | null;
    features?: string[] | null;
    labels?: string[] | null;
    specs?: Record<string, string> | null;
    images_hd?: string[] | null;
    storage_images?: string[] | null;
    source_url?: string | null;
  };
}

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'import-alkor');
  if (!(await checkRateLimit(rlKey, 5, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { rows, mode, dry_run = false } = await req.json() as {
      rows: AlkorRow[];
      mode: 'create' | 'enrich';
      dry_run?: boolean;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No rows provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolve ALKOR supplier_id once
    const alkorSupplierId = await resolveSupplier(supabase, 'alkor');

    // Batch EAN lookup
    const allEans = rows
      .map(r => normalizeEan(r.ean))
      .filter((e): e is string => e !== null);

    const existingByEan = await batchEanLookup(supabase, allEans);
    // Convert to simple Map<ean, id> for backward compat
    const eanToId = new Map<string, string>();
    for (const [ean, product] of existingByEan) {
      eanToId.set(ean, product.id);
    }

    // ── Dry-run mode ──
    if (dry_run) {
      const dryResult = createDryRunResult();

      for (const row of rows) {
        const ean = normalizeEan(row.ean);
        const ref = cleanStr(row.ref_art);
        if (!ref && !ean) { dryResult.would_skip++; continue; }

        const name = cleanStr(row.description) || cleanStr(row.libelle_court) || 'Sans nom';

        try {
          if (ean) {
            const existingId = eanToId.get(ean);
            if (existingId) {
              dryResult.would_update++;
              if (dryResult.sample_updates.length < 10) {
                dryResult.sample_updates.push({ ean, name, ref, changes: ['category', 'brand', 'description'] });
              }
            } else if (mode === 'create') {
              dryResult.would_create++;
              if (dryResult.sample_creates.length < 10) {
                dryResult.sample_creates.push({ ean, name, ref });
              }
            } else {
              dryResult.would_skip++;
            }
          } else if (mode === 'create') {
            dryResult.would_create++;
            if (dryResult.sample_creates.length < 10) {
              dryResult.sample_creates.push({ ean: null, name, ref });
            }
          } else {
            dryResult.would_skip++;
          }
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

    // ── Real import ──
    const result = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[], rollups_recomputed: 0 };
    const warningState = createWarningState();
    const alkorOffersBatch: any[] = [];
    const supplierProductsBatch: any[] = [];
    const touchedProductIds = new Set<string>();

    for (const row of rows) {
      const ean = normalizeEan(row.ean);
      const ref = cleanStr(row.ref_art);
      if (!ref && !ean) { result.skipped++; continue; }

      const isActive = row.cycle_vie?.trim()?.toLowerCase() === 'actif';
      const isEco = row.produit_eco?.trim()?.toUpperCase() === 'X';
      const description = cleanStr(row.libelle_commercial) || cleanStr(row.description) || '';
      const name = cleanStr(row.description) || cleanStr(row.libelle_court) || 'Sans nom';

      // Résolution catégorie via mapping fournisseur
      const famille = cleanStr(row.famille);
      const sousFamille = cleanStr(row.sous_famille);
      let categoryId: string | null = null;
      if (alkorSupplierId && famille) {
        categoryId = await resolveCategory(supabase, alkorSupplierId, famille, sousFamille);
      }

      const productData: Record<string, any> = {
        name: name.substring(0, 255),
        name_short: cleanStr(row.libelle_court)?.substring(0, 60) || null,
        description: description || null,
        category: famille || 'Non classé',
        subcategory: sousFamille || null,
        brand: cleanStr(row.marque_produit) || cleanStr(row.marque_fabricant) || null,
        manufacturer_code: cleanStr(row.code_fabricant) || null,
        oem_ref: cleanStr(row.ref_commerciale) || null,
        eco: isEco,
        is_end_of_life: !isActive,
        is_active: isActive,
        updated_at: new Date().toISOString(),
        attributs: {
          source: 'alkor',
          ref_alkor: ref,
          nom_fabricant: cleanStr(row.nom_fabricant) || null,
          fournisseur: cleanStr(row.fournisseur) || null,
          article_mdd: row.article_mdd?.trim() === 'X',
          norme_env1: cleanStr(row.norme_env1) || null,
          norme_env2: cleanStr(row.norme_env2) || null,
          num_agreement: cleanStr(row.num_agreement) || null,
          eligible_agec: row.eligible_agec?.trim()?.toLowerCase() === 'oui',
          complement_env: cleanStr(row.complement_env) || null,
          tx_recycle: cleanStr(row.tx_recycle) || null,
          tx_recyclable: cleanStr(row.tx_recyclable) || null,
          remplacement: cleanStr(row.remplacement) || null,
          // Enrichment from crawler
          ...(row.enrichment ? {
            weight: row.enrichment.weight || null,
            weight_unit: row.enrichment.weight_unit || null,
            dimensions: row.enrichment.dimensions || null,
            material: row.enrichment.material || null,
            color: row.enrichment.color || null,
            conditioning: row.enrichment.conditioning || null,
            unit_of_sale: row.enrichment.unit_of_sale || null,
            features: row.enrichment.features || null,
            labels: row.enrichment.labels || null,
            specs: row.enrichment.specs || null,
            source_url: row.enrichment.source_url || null,
          } : {}),
        },
      };

      // Apply enrichment to top-level product fields when available
      if (row.enrichment) {
        if (row.enrichment.weight) {
          const weightKg = row.enrichment.weight_unit === 'g'
            ? parseFloat(row.enrichment.weight) / 1000
            : parseFloat(row.enrichment.weight);
          if (!isNaN(weightKg)) productData.weight_kg = weightKg;
        }
        if (row.enrichment.dimensions) {
          productData.dimensions_cm = row.enrichment.dimensions;
        }
        if (row.enrichment.color) {
          productData.color = row.enrichment.color;
        }
      }

      // Assigner la catégorie interne si résolue
      if (categoryId) {
        productData.category_id = categoryId;
      }

      try {
        let savedProductId: string | null = null;

        if (ean) {
          const existingId = eanToId.get(ean);

          if (existingId) {
            const { error } = await supabase
              .from('products')
              .update(productData)
              .eq('id', existingId);
            if (error) throw error;
            savedProductId = existingId;
            result.updated++;
          } else if (mode === 'create') {
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
            savedProductId = inserted?.id || null;
            if (savedProductId) eanToId.set(ean, savedProductId);
            result.created++;
          } else {
            result.skipped++;
          }
        } else if (mode === 'create') {
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
          savedProductId = inserted?.id || null;
          result.created++;
        } else {
          result.skipped++;
        }

        if (savedProductId) touchedProductIds.add(savedProductId);

        // Créer mapping catégorie non vérifié si nouveau
        if (savedProductId && alkorSupplierId && famille && categoryId) {
          await createUnverifiedMapping(supabase, alkorSupplierId, famille, sousFamille, categoryId);
        }

        // supplier_offers upsert (ALKOR - catalogue sans prix)
        if (savedProductId && ref) {
          alkorOffersBatch.push({
            product_id: savedProductId,
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

        // supplier_products upsert (stable mapping)
        if (savedProductId && alkorSupplierId && ref) {
          supplierProductsBatch.push({
            supplier_id: alkorSupplierId,
            product_id: savedProductId,
            supplier_reference: ref,
            source_type: 'alkor-catalogue',
            is_preferred: false,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e: any) {
        result.errors++;
        if (result.details.length < 30) {
          result.details.push(`${ref || ean}: ${e.message}`);
        }
      }
    }

    // Flush supplier_offers (ALKOR)
    await flushBatch(supabase, 'supplier_offers', alkorOffersBatch, {
      onConflict: 'supplier,supplier_product_id',
      warningState,
      label: 'supplier_offers',
    });

    // Flush supplier_products (stable mapping)
    if (alkorSupplierId) {
      await flushBatch(supabase, 'supplier_products', supplierProductsBatch, {
        onConflict: 'supplier_id,product_id',
        warningState,
        label: 'supplier_products',
      });
    }

    // Désactiver les offres ALKOR fantômes
    await deactivateGhostOffers(supabase, 'ALKOR', 'ghost_offer_threshold_alkor_days', 3);

    // Batch rollup recompute
    if (touchedProductIds.size > 0) {
      result.rollups_recomputed = await batchRecomputeRollups(
        supabase,
        Array.from(touchedProductIds),
      );
    }

    // Log the import
    await logImport(supabase, 'alkor-catalogue', rows.length, result, {
      warnings_count: warningState.total,
    });

    return new Response(JSON.stringify({
      ...result,
      warnings_count: warningState.total,
      warnings: warningState.list,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'import Alkor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
