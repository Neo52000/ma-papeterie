import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    let result: { success: number; errors: number; details?: string[] } = { success: 0, errors: 0, details: [] };

    const parseDecimal = (val: string): number => {
      if (!val || val.trim() === '') return 0;
      return parseFloat(val.replace(',', '.')) || 0;
    };

    switch (source) {
      case 'herstinfo': {
        // TAB-separated: code, name, company, street, zip, city, country, website
        const lines = data.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          const cols = line.split('\t');
          if (cols.length < 2) continue;
          try {
            const { error } = await supabase.from('brands').upsert({
              code: cols[0]?.trim(),
              name: cols[1]?.trim(),
              company: cols[2]?.trim() || null,
              country: cols[6]?.trim() || null,
              website: cols[7]?.trim() || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'code' });
            if (error) throw error;
            result.success++;
          } catch (e) {
            result.errors++;
            result.details?.push(`Brand ${cols[0]}: ${e.message}`);
          }
        }
        break;
      }

      case 'preislis': {
        // TAB-separated, 42+ columns
        // Col 0: ref_softcarrier, 1: EAN, 2: name, 3: name_short, 4: category, 5: subcategory
        // 6: brand_code, 7: oem_ref, 8: vat_code, 9: price_ht (palier 1)
        // 10-15: qty thresholds for tiers 2-6, 16-21: prices for tiers 2-6
        // 22: price_pvp, 23: weight_kg, 24: country_origin, 25: customs_code
        // 26: eco_cop, 27: eco_d3e, 28: is_end_of_life, 29: is_special_order
        const lines = data.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          const cols = line.split('\t');
          if (cols.length < 10) continue;
          const ref = cols[0]?.trim();
          if (!ref) continue;

          try {
            // Upsert product
            const productData = {
              ref_softcarrier: ref,
              ean: cols[1]?.trim() || null,
              name: cols[2]?.trim() || 'Sans nom',
              name_short: cols[3]?.trim() || null,
              category: cols[4]?.trim() || 'Non classé',
              subcategory: cols[5]?.trim() || null,
              brand: cols[6]?.trim() || null,
              oem_ref: cols[7]?.trim() || null,
              vat_code: parseInt(cols[8]) || 1,
              price: parseDecimal(cols[9]),
              price_ht: parseDecimal(cols[9]),
              price_ttc: parseDecimal(cols[22]) || parseDecimal(cols[9]) * 1.2,
              weight_kg: parseDecimal(cols[23]) || null,
              country_origin: cols[24]?.trim() || null,
              customs_code: cols[25]?.trim() || null,
              eco_tax: parseDecimal(cols[26]) + parseDecimal(cols[27]),
              is_end_of_life: cols[28]?.trim() === '1',
              is_special_order: cols[29]?.trim() === '1',
              updated_at: new Date().toISOString(),
            };

            const { data: upserted, error: prodError } = await supabase
              .from('products')
              .upsert(productData, { onConflict: 'ref_softcarrier' })
              .select('id')
              .single();

            if (prodError) throw prodError;
            const productId = upserted.id;

            // Delete old tiers and insert new ones
            await supabase.from('supplier_price_tiers').delete().eq('product_id', productId);

            const tiers = [];
            // Tier 1: always qty 1
            tiers.push({
              product_id: productId,
              tier: 1,
              min_qty: 1,
              price_ht: parseDecimal(cols[9]),
              price_pvp: parseDecimal(cols[22]) || null,
              tax_cop: parseDecimal(cols[26]),
              tax_d3e: parseDecimal(cols[27]),
            });

            // Tiers 2-6: qty thresholds in cols 10-14, prices in cols 16-20
            for (let t = 2; t <= 6; t++) {
              const qtyIdx = 8 + t; // 10, 11, 12, 13, 14
              const priceIdx = 14 + t; // 16, 17, 18, 19, 20
              const qty = parseInt(cols[qtyIdx]) || 0;
              const price = parseDecimal(cols[priceIdx]);
              if (qty > 0 && price > 0) {
                tiers.push({
                  product_id: productId,
                  tier: t,
                  min_qty: qty,
                  price_ht: price,
                  price_pvp: null,
                  tax_cop: parseDecimal(cols[26]),
                  tax_d3e: parseDecimal(cols[27]),
                });
              }
            }

            if (tiers.length > 0) {
              const { error: tierError } = await supabase.from('supplier_price_tiers').insert(tiers);
              if (tierError) throw tierError;
            }

            result.success++;
          } catch (e) {
            result.errors++;
            result.details?.push(`Product ${ref}: ${e.message}`);
          }
        }
        break;
      }

      case 'artx': {
        // Fixed-width: language code at pos 0-2, ref at pos 5-22, descriptions at 23+
        const lines = data.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.length < 23) continue;
          const lang = line.substring(0, 3).trim();
          if (lang !== '003') continue; // French only

          const ref = line.substring(5, 23).trim();
          if (!ref) continue;

          try {
            // Extract descriptions: 62 blocks of 60 chars each
            const descBlocks: string[] = [];
            for (let i = 0; i < 62; i++) {
              const start = 23 + (i * 60);
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
            }
          } catch (e) {
            result.errors++;
            result.details?.push(`ARTX ${ref}: ${e.message}`);
          }
        }
        break;
      }

      case 'tarifsb2b': {
        // CSV semicolon, UTF-8 BOM
        let cleanData = data;
        if (cleanData.charCodeAt(0) === 0xFEFF) cleanData = cleanData.substring(1);
        
        const lines = cleanData.split('\n').filter((l: string) => l.trim());
        const header = lines[0]?.split(';').map((h: string) => h.trim().toLowerCase());
        if (!header) break;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(';');
          if (cols.length < 5) continue;

          const ref = cols[0]?.trim();
          if (!ref) continue;

          try {
            // Update product with B2B-specific fields
            const updateData: Record<string, any> = {
              ref_b2b: cols[1]?.trim() || null,
              updated_at: new Date().toISOString(),
            };

            const { data: prod, error: findError } = await supabase
              .from('products')
              .select('id')
              .eq('ref_softcarrier', ref)
              .maybeSingle();

            if (findError) throw findError;
            if (!prod) {
              result.details?.push(`TarifsB2B: ref ${ref} not found`);
              result.errors++;
              continue;
            }

            await supabase.from('products').update(updateData).eq('id', prod.id);

            // Parse packagings (UMV, UVE, ENV, EMB, Palette)
            await supabase.from('product_packagings').delete().eq('product_id', prod.id);
            const packagings: any[] = [];
            const types = ['UMV', 'UVE', 'ENV', 'EMB', 'Palette'];
            // Assume cols layout: ref, ref_b2b, ..., then packaging blocks
            for (let t = 0; t < types.length; t++) {
              const baseIdx = 5 + (t * 4); // qty, ean, weight, dimensions
              if (baseIdx + 3 < cols.length) {
                const qty = parseInt(cols[baseIdx]) || 0;
                if (qty > 0) {
                  packagings.push({
                    product_id: prod.id,
                    packaging_type: types[t],
                    qty,
                    ean: cols[baseIdx + 1]?.trim() || null,
                    weight_gr: parseInt(cols[baseIdx + 2]) || null,
                    dimensions: cols[baseIdx + 3]?.trim() || null,
                  });
                }
              }
            }

            if (packagings.length > 0) {
              const { error: pkgError } = await supabase.from('product_packagings').insert(packagings);
              if (pkgError) throw pkgError;
            }

            result.success++;
          } catch (e) {
            result.errors++;
            result.details?.push(`TarifsB2B ${ref}: ${e.message}`);
          }
        }
        break;
      }

      case 'lagerbestand': {
        // CSV: ref_softcarrier;qty_available;delivery_week
        const lines = data.split('\n').filter((l: string) => l.trim());
        const snapshots: any[] = [];
        const fetchedAt = new Date().toISOString();

        for (const line of lines) {
          const cols = line.split(';');
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

        if (snapshots.length > 0) {
          // Batch insert snapshots (in chunks of 500)
          for (let i = 0; i < snapshots.length; i += 500) {
            const chunk = snapshots.slice(i, i + 500);
            const { error } = await supabase.from('supplier_stock_snapshots').insert(chunk);
            if (error) {
              result.errors += chunk.length;
              result.details?.push(`Stock batch error: ${error.message}`);
            } else {
              result.success += chunk.length;
            }
          }
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown source: ${source}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Log the import
    await supabase.from('supplier_import_logs').insert({
      format: `softcarrier-${source}`,
      total_rows: result.success + result.errors,
      success_count: result.success,
      error_count: result.errors,
      errors: result.details?.slice(0, 50) || [],
      imported_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
