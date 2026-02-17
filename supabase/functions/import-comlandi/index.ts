import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { rows, mode } = await req.json() as { rows: ComlandiRow[]; mode: 'create' | 'enrich' };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No rows provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[] };

    const parseNum = (val?: string): number => {
      if (!val || val.trim() === '' || val === 'N/D') return 0;
      return parseFloat(val.trim().replace(',', '.')) || 0;
    };

    const cleanStr = (val?: string): string | null => {
      if (!val || val.trim() === '' || val === 'N/D') return null;
      return val.trim();
    };

    const BATCH = 50;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);

      for (const row of batch) {
        // Primary EAN: prefer ean_unite, fallback to ean_umv
        const ean = cleanStr(row.ean_unite) || cleanStr(row.ean_umv);
        const ref = cleanStr(row.reference) || cleanStr(row.code);
        if (!ref && !ean) { result.skipped++; continue; }

        // Skip if marked as unavailable
        if (row.indisponible && row.indisponible.trim() !== '') { result.skipped++; continue; }

        const prixHT = parseNum(row.prix);
        const tvaRate = parseNum(row.tva) || 20;
        const prixTTC = prixHT > 0 ? Math.round(prixHT * (1 + tvaRate / 100) * 100) / 100 : 0;

        const ecoTax = parseNum(row.taxe_cop) + parseNum(row.taxe_d3e) + parseNum(row.taxe_mob) + parseNum(row.taxe_scm) + parseNum(row.taxe_sod);

        const name = cleanStr(row.description) || cleanStr(row.description_breve) || 'Sans nom';
        const description = cleanStr(row.description_longue) || cleanStr(row.description_breve) || '';

        const productData: Record<string, any> = {
          name: name.substring(0, 255),
          name_short: cleanStr(row.description_breve)?.substring(0, 60) || null,
          description: description || null,
          category: cleanStr(row.categorie) || 'Non classé',
          subcategory: cleanStr(row.sous_categorie) || null,
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
          if (ean) {
            const { data: existing } = await supabase
              .from('products')
              .select('id')
              .eq('ean', ean)
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', existing.id);
              if (error) throw error;
              result.updated++;
            } else if (mode === 'create') {
              productData.ean = ean;
              const { error } = await supabase
                .from('products')
                .insert(productData);
              if (error) throw error;
              result.created++;
            } else {
              result.skipped++;
            }
          } else if (mode === 'create') {
            productData.ean = null;
            const { error } = await supabase
              .from('products')
              .insert(productData);
            if (error) throw error;
            result.created++;
          } else {
            result.skipped++;
          }
        } catch (e: any) {
          result.errors++;
          if (result.details.length < 30) {
            result.details.push(`${ref || ean}: ${e.message}`);
          }
        }
      }
    }

    // Log the import
    try {
      await supabase.from('supplier_import_logs').insert({
        format: 'comlandi-catalogue',
        total_rows: rows.length,
        success_count: result.created + result.updated,
        error_count: result.errors,
        errors: result.details.slice(0, 50),
        imported_at: new Date().toISOString(),
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
