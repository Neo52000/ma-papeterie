import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, requireApiSecret, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { normalizeEan } from "../_shared/normalize-ean.ts";
import {
  resolveSupplier,
  flushBatch,
  createWarningState,
  deactivateGhostOffers,
  logImport,
} from "../_shared/import-helpers.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'import-softcarrier');
  if (!(await checkRateLimit(rlKey, 5, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Auth: admin JWT (manual) or API secret (cron/internal sync)
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) {
    const secretError = requireApiSecret(req, corsHeaders);
    if (secretError) return authResult.error;
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { source, data } = await req.json();
    if (!source || !data) {
      return new Response(JSON.stringify({ error: 'Missing source or data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result: { success: number; errors: number; skipped: number; details: string[] } = {
      success: 0, errors: 0, skipped: 0, details: []
    };

    const parseDecimal = (val: string | undefined): number => {
      if (!val || val.trim() === '') return 0;
      return parseFloat(val.trim().replace(',', '.')) || 0;
    };

    const addError = (msg: string) => {
      result.errors++;
      if (result.details.length < 50) result.details.push(msg);
    };

    switch (source) {
      // ───────────────────────────────────────────────
      // HERSTINFO.TXT — Référentiel marques/fabricants
      // TAB-separated, 8 columns:
      // 0:Marque 1:Société1 2:Société2 3:Rue 4:Pays 5:CP 6:Ville 7:Website
      // ───────────────────────────────────────────────
      case 'herstinfo': {
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const batchSize = 100;
        
        for (let i = 0; i < lines.length; i += batchSize) {
          const batch = lines.slice(i, i + batchSize);
          const records: any[] = [];
          
          for (const line of batch) {
            const cols = line.split('\t');
            const name = cols[0]?.trim();
            if (!name) continue;
            
            records.push({
              name,
              company: cols[1]?.trim() || null,
              country: cols[4]?.trim() || null,
              website: cols[7]?.trim() || null,
              code: name.substring(0, 10).toUpperCase().replace(/\s+/g, '_'),
              updated_at: new Date().toISOString(),
            });
          }
          
          if (records.length > 0) {
            const { error } = await supabase
              .from('brands')
              .upsert(records, { onConflict: 'name', ignoreDuplicates: false });
            
            if (error) {
              result.errors += records.length;
              result.details.push(`Batch ${Math.floor(i/batchSize)+1}: ${error.message}`);
            } else {
              result.success += records.length;
            }
          }
        }
        break;
      }

      // ───────────────────────────────────────────────
      // PREISLIS.TXT — Liste de prix principale
      // ASCII TAB, 42 colonnes, CP850, décimale virgule
      //
      // MAPPING EXACT (doc v1.0) :
      //  A(0)  = Groupe principal (catégorie)
      //  B(1)  = Sous-groupe
      //  C(2)  = Référence article 18 chiffres (CLÉ)
      //  D(3)  = Désignation article (name)
      //  E-I(4-8) = Textes complémentaires 1-5 (description)
      //  J(9)  = Qté palier 1    K(10) = Prix palier 1
      //  L(11) = Qté palier 2    M(12) = Prix palier 2
      //  N(13) = Qté palier 3    O(14) = Prix palier 3
      //  P(15) = Qté palier 4    Q(16) = Prix palier 4
      //  R(17) = Qté palier 5    S(18) = Prix palier 5
      //  T(19) = Qté palier 6    U(20) = Prix palier 6
      //  V(21) = Prix unitaire (base 1000)
      //  W(22) = Emballage unitaire
      //  X(23) = Poids (kg)
      //  ... (Y=24, Z=25, AA=26)
      //  AB(27) = Marque/fabricant
      //  AC(28) = Numéro OEM
      //  AD(29) = EAN
      //  ... (AE=30 .. AJ=35)
      //  AK(36) = Stock disponible
      //  AL(37) = Code TVA (1=normal 20%, 2=réduit 5.5%)
      //  ... remaining cols unused
      // ───────────────────────────────────────────────
      case 'preislis': {
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const softOffersBatch: any[] = [];
        const priceHistoryBatch: any[] = [];
        const softSupplierId = await resolveSupplier(supabase, 'softcarrier');
        
        for (const line of lines) {
          const cols = line.split('\t');
          if (cols.length < 30) { result.skipped++; continue; }
          
          const ref = cols[2]?.trim(); // Col C = référence article
          if (!ref || ref.length < 3) { result.skipped++; continue; }

          try {
            // Description = concaténation cols E-I (4-8)
            const descParts = [cols[4], cols[5], cols[6], cols[7], cols[8]]
              .map(c => c?.trim())
              .filter(Boolean);
            const description = descParts.join(' ').trim() || null;

            // Prix palier 1 = col K (10)
            const priceHt = parseDecimal(cols[10]);
            const vatCode = parseInt(cols[37]) || 1;
            const vatRate = vatCode === 2 ? 1.055 : 1.20;
            const stockQty = parseInt(cols[36]) || 0;
            const isEndOfLife = cols[34]?.trim() === '1';

            const productData: Record<string, any> = {
              ref_softcarrier: ref,
              name: cols[3]?.trim() || 'Sans nom',           // Col D
              category: cols[0]?.trim() || 'Non classé',      // Col A
              subcategory: cols[1]?.trim() || null,            // Col B
              brand: cols[27]?.trim() || null,                 // Col AB
              oem_ref: cols[28]?.trim() || null,               // Col AC
              ean: normalizeEan(cols[29]) || null,              // Col AD (normalisé)
              vat_code: vatCode,                               // Col AL
              price: priceHt > 0 ? priceHt : 0.01,
              price_ht: priceHt,
              price_ttc: Math.round(priceHt * vatRate * 100) / 100,
              weight_kg: parseDecimal(cols[23]) || null,       // Col X
              stock_quantity: stockQty,                         // Col AK
              eco_tax: 0,
              is_end_of_life: isEndOfLife,                     // Col AI
              is_special_order: cols[35]?.trim() === '1',      // Col AJ
              country_origin: cols[32]?.trim() || null,        // Col AG
              updated_at: new Date().toISOString(),
            };

            if (description) productData.description = description;

            // Fallback EAN : si un produit existe par EAN mais sans ref_softcarrier, lier au lieu de créer un doublon
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
                // Produit existe par EAN mais sans ref_softcarrier → mettre à jour
                await supabase.from('products')
                  .update({ ref_softcarrier: ref, ...productData })
                  .eq('id', byEan.id);
                productId = byEan.id;
                foundByEan = true;
              } else if (byEan && byEan.ref_softcarrier === ref) {
                productId = byEan.id;
                foundByEan = true;
              }
            }

            if (!foundByEan) {
              // Tracking prix : vérifier si le produit existe déjà pour détecter les changements
              const { data: existingProd } = await supabase
                .from('products')
                .select('id, price_ht, price_ttc, cost_price')
                .eq('ref_softcarrier', ref)
                .maybeSingle();

              if (existingProd && (existingProd.price_ht !== productData.price_ht || existingProd.price_ttc !== productData.price_ttc)) {
                priceHistoryBatch.push({
                  product_id: existingProd.id,
                  changed_by: 'import-softcarrier-preislis',
                  supplier_id: softSupplierId,
                  old_cost_price: existingProd.cost_price,
                  new_cost_price: priceHt > 0 ? priceHt : null,
                  old_price_ht: existingProd.price_ht,
                  new_price_ht: productData.price_ht,
                  old_price_ttc: existingProd.price_ttc,
                  new_price_ttc: productData.price_ttc,
                  change_reason: 'import-softcarrier-preislis',
                });
              }

              const { data: upserted, error: prodError } = await supabase
                .from('products')
                .upsert(productData, { onConflict: 'ref_softcarrier' })
                .select('id')
                .single();
              if (prodError) throw prodError;
              productId = upserted.id;
            }

            // ── Paliers tarifaires ──
            await supabase.from('supplier_price_tiers').delete().eq('product_id', productId);

            const tiers: any[] = [];
            // 6 paliers: J/K, L/M, N/O, P/Q, R/S, T/U → indices (9,10), (11,12), (13,14), (15,16), (17,18), (19,20)
            for (let t = 0; t < 6; t++) {
              const qtyIdx = 9 + (t * 2);   // J=9, L=11, N=13, P=15, R=17, T=19
              const priceIdx = 10 + (t * 2); // K=10, M=12, O=14, Q=16, S=18, U=20
              const qty = parseInt(cols[qtyIdx]) || 0;
              const price = parseDecimal(cols[priceIdx]);
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
              const { error: tierError } = await supabase.from('supplier_price_tiers').insert(tiers);
              if (tierError) throw tierError;
            }

            // ── Collecter supplier_offers (SOFT) ──
            softOffersBatch.push({
              product_id: productId,
              supplier: 'SOFT',
              supplier_product_id: ref,
              purchase_price_ht: priceHt > 0 ? priceHt : null,
              pvp_ttc: null, // PVP vient de TarifsB2B
              vat_rate: vatCode === 2 ? 5.5 : 20,
              tax_breakdown: {},
              stock_qty: stockQty,
              min_qty: parseInt(cols[22]) || 1, // Col W = emballage unitaire
              is_active: !isEndOfLife,
              last_seen_at: new Date().toISOString(),
            });

            result.success++;
          } catch (e: any) {
            addError(`PREISLIS ${ref}: ${e.message}`);
          }
        }

        // ── Flush price history (tracking prix Softcarrier) ──
        const warningState = createWarningState();
        if (priceHistoryBatch.length > 0) {
          await flushBatch(supabase, 'product_price_history', priceHistoryBatch, {
            warningState,
            label: 'product_price_history',
          });
        }

        // ── Flush supplier_offers (SOFT/preislis) ──
        await flushBatch(supabase, 'supplier_offers', softOffersBatch, {
          onConflict: 'supplier,supplier_product_id',
          warningState,
          label: 'supplier_offers',
        });

        // Désactiver les offres SOFT fantômes
        await deactivateGhostOffers(supabase, 'SOFT', 'ghost_offer_threshold_soft_days', 7);

        break;
      }

      // ───────────────────────────────────────────────
      // ARTX.IMP — Désignations complètes
      // Largeur fixe, CP850, ~310k lignes
      // Pos 1 (idx 0)    : Fonction (ignorée)
      // Pos 2-4 (idx 1-3): Langue → filtrer 003 (français)
      // Pos 5-22 (idx 4-21): Numéro article
      // Pos 23-3742 (idx 22+): 62×60 chars descriptions
      // ───────────────────────────────────────────────
      case 'artx': {
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.length < 22) { result.skipped++; continue; }
          
          const lang = line.substring(1, 4).trim();  // Pos 2-4
          if (lang !== '003') { result.skipped++; continue; } // French only

          const ref = line.substring(4, 22).trim();   // Pos 5-22
          if (!ref) { result.skipped++; continue; }

          try {
            const descBlocks: string[] = [];
            for (let i = 0; i < 62; i++) {
              const start = 22 + (i * 60); // Pos 23+ = idx 22+
              if (start >= line.length) break;
              const block = line.substring(start, start + 60).trim();
              if (block) descBlocks.push(block);
            }
            const description = descBlocks.join(' ').trim();

            if (description) {
              const { error } = await supabase
                .from('products')
                .update({ description, updated_at: new Date().toISOString() })
                .eq('ref_softcarrier', ref);
              if (error) throw error;
              result.success++;
            } else {
              result.skipped++;
            }
          } catch (e: any) {
            addError(`ARTX ${ref}: ${e.message}`);
          }
        }
        break;
      }

      // ───────────────────────────────────────────────
      // TarifsB2B.csv — Catalogue B2B enrichi
      // UTF-8 BOM, point-virgule, décimale virgule
      // Détection dynamique des colonnes par header
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

        // Map key columns
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

        // Packaging columns detection
        const colUmvQty = findCol(['umv']);
        const colUmvEan = findCol(['ean umv', 'ean unite']);
        const colUveQty = findCol(['uve']);
        const colUveEan = findCol(['ean uve']);
        const colEnvQty = findCol(['env']);
        const colEnvEan = findCol(['ean env']);
        const colPoidsUmv = findCol(['poids umv']);

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(';');
          if (cols.length < 5) continue;

          const ref = colRef >= 0 ? cols[colRef]?.trim() : cols[1]?.trim();
          const code = colCode >= 0 ? cols[colCode]?.trim() : cols[0]?.trim();
          if (!ref && !code) { result.skipped++; continue; }

          try {
            // Find product by ref_softcarrier or ref_b2b
            let prod = null;
            if (ref) {
              const { data: p } = await supabase
                .from('products')
                .select('id')
                .eq('ref_softcarrier', ref)
                .maybeSingle();
              prod = p;
            }
            if (!prod && code) {
              const { data: p } = await supabase
                .from('products')
                .select('id')
                .eq('ref_b2b', code)
                .maybeSingle();
              prod = p;
            }

            if (!prod) {
              result.skipped++;
              if (result.details.length < 20) {
                result.details.push(`TarifsB2B: ref ${ref || code} non trouvée`);
              }
              continue;
            }

            // Update product
            const updateData: Record<string, any> = {
              updated_at: new Date().toISOString(),
            };
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
              const tvaVal = parseDecimal(cols[colTva]);
              if (tvaVal > 0) updateData.tva_rate = tvaVal;
            }
            if (colPoidsUmv >= 0) {
              const wg = parseInt(cols[colPoidsUmv]) || 0;
              if (wg > 0) updateData.weight_kg = wg / 1000;
            }

            await supabase.from('products').update(updateData).eq('id', prod.id);

            // ── Mettre à jour supplier_offers avec PVP et taxes (TarifsB2B) ──
            const pvpVal = colPvp >= 0 ? parseDecimal(cols[colPvp]) : 0;
            if (pvpVal > 0) {
              const taxBD: Record<string, number> = {};
              if (colTaxeCop >= 0) { const v = parseDecimal(cols[colTaxeCop]); if (v > 0) taxBD.COP = v; }
              if (colTaxeD3e >= 0) { const v = parseDecimal(cols[colTaxeD3e]); if (v > 0) taxBD.D3E = v; }
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
            }

            // Update price tiers with PVP and taxes if available
            if (colPvp >= 0 || colTaxeCop >= 0 || colTaxeD3e >= 0) {
              const tierUpdate: Record<string, any> = {};
              if (colPvp >= 0) tierUpdate.price_pvp = parseDecimal(cols[colPvp]) || null;
              if (colTaxeCop >= 0) tierUpdate.tax_cop = parseDecimal(cols[colTaxeCop]);
              if (colTaxeD3e >= 0) tierUpdate.tax_d3e = parseDecimal(cols[colTaxeD3e]);
              
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
              const { error: pkgError } = await supabase.from('product_packagings').insert(packagings);
              if (pkgError) throw pkgError;
            }

            result.success++;
          } catch (e: any) {
            addError(`TarifsB2B ${ref || code}: ${e.message}`);
          }
        }
        break;
      }

      // ───────────────────────────────────────────────
      // LAGERBESTAND.CSV — Stock temps réel
      // 3 champs: ref;qty;delivery_week
      // ───────────────────────────────────────────────
      case 'lagerbestand': {
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const fetchedAt = new Date().toISOString();

        // Skip header if alphabetic
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

        // Batch insert
        for (let i = 0; i < snapshots.length; i += 500) {
          const chunk = snapshots.slice(i, i + 500);
          const { error } = await supabase.from('supplier_stock_snapshots').insert(chunk);
          if (error) {
            result.errors += chunk.length;
            result.details.push(`Stock batch ${Math.floor(i/500)+1}: ${error.message}`);
          } else {
            result.success += chunk.length;
          }
        }

        // ── Mettre à jour stock_qty dans supplier_offers (SOFT/lagerbestand) ──
        const fetchedAtNow = new Date().toISOString();
        for (let i = 0; i < snapshots.length; i += 100) {
          const chunk = snapshots.slice(i, i + 100);
          for (const snap of chunk) {
            try {
              await supabase.from('supplier_offers')
                .update({ stock_qty: snap.qty_available, last_seen_at: fetchedAtNow })
                .eq('supplier', 'SOFT')
                .eq('supplier_product_id', snap.ref_softcarrier);
            } catch (_) { /* non-bloquant */ }
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
    try {
      await supabase.from('supplier_import_logs').insert({
        format: `softcarrier-${source}`,
        total_rows: result.success + result.errors + result.skipped,
        success_count: result.success,
        error_count: result.errors,
        errors: result.details.slice(0, 50),
        imported_at: new Date().toISOString(),
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Erreur lors de l\'import SoftCarrier' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
