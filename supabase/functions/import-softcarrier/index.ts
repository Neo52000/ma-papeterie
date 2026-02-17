import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const parseDecimal = (val: string | undefined): number => {
      if (!val || val.trim() === '') return 0;
      return parseFloat(val.trim().replace(',', '.')) || 0;
    };

    switch (source) {
      case 'herstinfo': {
        // HERSTINFO.TXT - TAB-separated, 8 columns:
        // col0: brand_name, col1: company, col2: company2, col3: street, 
        // col4: country, col5: zip, col6: city, col7: website
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
              code: cols[0]?.trim().substring(0, 10).toUpperCase().replace(/\s+/g, '_') || null,
              updated_at: new Date().toISOString(),
            });
          }
          
          if (records.length > 0) {
            const { error, count } = await supabase
              .from('brands')
              .upsert(records, { onConflict: 'name', ignoreDuplicates: false });
            
            if (error) {
              result.errors += records.length;
              result.details?.push(`Batch ${Math.floor(i/batchSize)+1}: ${error.message}`);
            } else {
              result.success += records.length;
            }
          }
        }
        break;
      }

      case 'preislis': {
        // PREISLIS.TXT - TAB-separated, 42+ columns
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        
        for (const line of lines) {
          const cols = line.split('\t');
          if (cols.length < 10) continue;
          const ref = cols[0]?.trim();
          if (!ref) continue;

          try {
            const priceHt = parseDecimal(cols[9]);
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
              price: priceHt > 0 ? priceHt : 0.01,
              price_ht: priceHt,
              price_ttc: parseDecimal(cols[22]) || priceHt * 1.2,
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
            tiers.push({
              product_id: productId,
              tier: 1,
              min_qty: 1,
              price_ht: priceHt,
              price_pvp: parseDecimal(cols[22]) || null,
              tax_cop: parseDecimal(cols[26]),
              tax_d3e: parseDecimal(cols[27]),
            });

            for (let t = 2; t <= 6; t++) {
              const qtyIdx = 8 + t;
              const priceIdx = 14 + t;
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
          } catch (e: any) {
            result.errors++;
            if (result.details!.length < 20) {
              result.details?.push(`Product ${ref}: ${e.message}`);
            }
          }
        }
        break;
      }

      case 'artx': {
        // Fixed-width: language code at pos 0-2, ref at pos 5-22, descriptions at 23+
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.length < 23) continue;
          const lang = line.substring(0, 3).trim();
          if (lang !== '003') continue;

          const ref = line.substring(5, 23).trim();
          if (!ref) continue;

          try {
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
          } catch (e: any) {
            result.errors++;
            if (result.details!.length < 20) {
              result.details?.push(`ARTX ${ref}: ${e.message}`);
            }
          }
        }
        break;
      }

      case 'tarifsb2b': {
        // CSV semicolon, UTF-8 BOM
        let cleanData = data;
        if (cleanData.charCodeAt(0) === 0xFEFF) cleanData = cleanData.substring(1);
        
        const lines = cleanData.split(/\r?\n/).filter((l: string) => l.trim());
        // Skip header
        if (lines.length < 2) break;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(';');
          if (cols.length < 5) continue;

          const ref = cols[0]?.trim();
          if (!ref) continue;

          try {
            const { data: prod, error: findError } = await supabase
              .from('products')
              .select('id')
              .eq('ref_softcarrier', ref)
              .maybeSingle();

            if (findError) throw findError;
            if (!prod) {
              result.errors++;
              if (result.details!.length < 20) {
                result.details?.push(`TarifsB2B: ref ${ref} non trouvée`);
              }
              continue;
            }

            await supabase.from('products').update({
              ref_b2b: cols[1]?.trim() || null,
              updated_at: new Date().toISOString(),
            }).eq('id', prod.id);

            // Parse packagings
            await supabase.from('product_packagings').delete().eq('product_id', prod.id);
            const packagings: any[] = [];
            const types = ['UMV', 'UVE', 'ENV', 'EMB', 'Palette'];
            for (let t = 0; t < types.length; t++) {
              const baseIdx = 5 + (t * 4);
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
          } catch (e: any) {
            result.errors++;
            if (result.details!.length < 20) {
              result.details?.push(`TarifsB2B ${ref}: ${e.message}`);
            }
          }
        }
        break;
      }

      case 'lagerbestand': {
        // CSV: ref_softcarrier;qty_available;delivery_week
        const lines = data.split(/\r?\n/).filter((l: string) => l.trim());
        const fetchedAt = new Date().toISOString();

        // Skip header if it looks like one
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

        if (snapshots.length > 0) {
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
    }).then(() => {}).catch(() => {}); // Don't fail on log errors

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
