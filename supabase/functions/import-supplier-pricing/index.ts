import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplierPricingRow {
  supplier_reference: string;
  product_name?: string;
  ean?: string;
  supplier_price: number;
  stock_quantity?: number;
  lead_time_days?: number;
  min_order_quantity?: number;
  quantity_discount?: Record<string, number>;
}

interface ImportRequest {
  supplierId: string;
  format: 'csv' | 'xml' | 'json';
  data: SupplierPricingRow[];
  filename?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le rôle admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roles || !['admin', 'super_admin'].includes(roles.role)) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parser la requête
    const body: ImportRequest = await req.json();
    const { supplierId, format, data, filename } = body;

    console.log(`[import-supplier-pricing] Starting import for supplier ${supplierId}`);
    console.log(`[import-supplier-pricing] Format: ${format}, Rows: ${data.length}`);

    if (!supplierId || !data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Données invalides' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que le fournisseur existe
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ error: 'Fournisseur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Charger les produits existants pour le matching
    const { data: products } = await supabase
      .from('products')
      .select('id, name, ean');

    const productsByEan = new Map<string, { id: string; name: string }>();
    const productsByName = new Map<string, { id: string; name: string }>();
    
    if (products) {
      for (const product of products) {
        if (product.ean) {
          productsByEan.set(product.ean, { id: product.id, name: product.name });
        }
        // Normaliser le nom pour le matching
        const normalizedName = product.name.toLowerCase().trim();
        productsByName.set(normalizedName, { id: product.id, name: product.name });
      }
    }

    // Charger les produits fournisseur existants
    const { data: existingSupplierProducts } = await supabase
      .from('supplier_products')
      .select('id, product_id, supplier_reference')
      .eq('supplier_id', supplierId);

    const existingByRef = new Map<string, { id: string; product_id: string }>();
    if (existingSupplierProducts) {
      for (const sp of existingSupplierProducts) {
        if (sp.supplier_reference) {
          existingByRef.set(sp.supplier_reference, { 
            id: sp.id, 
            product_id: sp.product_id 
          });
        }
      }
    }

    // Traiter chaque ligne
    let successCount = 0;
    let errorCount = 0;
    let unmatchedCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Trouver le produit correspondant
        let matchedProductId: string | null = null;
        let matchMethod = 'none';

        // Priorité 1: EAN exact
        if (row.ean) {
          const normalizedEan = row.ean.replace(/\s/g, '');
          const matchedProduct = productsByEan.get(normalizedEan);
          if (matchedProduct) {
            matchedProductId = matchedProduct.id;
            matchMethod = 'ean';
          }
        }

        // Priorité 2: Référence fournisseur existante
        if (!matchedProductId && row.supplier_reference) {
          const existing = existingByRef.get(row.supplier_reference);
          if (existing && existing.product_id) {
            matchedProductId = existing.product_id;
            matchMethod = 'existing_ref';
          }
        }

        // Priorité 3: Nom du produit (matching approximatif)
        if (!matchedProductId && row.product_name) {
          const normalizedName = row.product_name.toLowerCase().trim();
          const matchedProduct = productsByName.get(normalizedName);
          if (matchedProduct) {
            matchedProductId = matchedProduct.id;
            matchMethod = 'name';
          }
        }

        // Préparer les données pour upsert
        const supplierProductData = {
          supplier_id: supplierId,
          product_id: matchedProductId || null,
          supplier_reference: row.supplier_reference,
          supplier_price: row.supplier_price,
          stock_quantity: row.stock_quantity ?? null,
          lead_time_days: row.lead_time_days ?? null,
          min_order_quantity: row.min_order_quantity ?? null,
          quantity_discount: row.quantity_discount ?? null,
          source_type: `import_${format}`,
          updated_at: new Date().toISOString(),
        };

        // Vérifier si existe déjà
        const existing = existingByRef.get(row.supplier_reference);
        
        if (existing) {
          // Update
          const { error: updateError } = await supabase
            .from('supplier_products')
            .update(supplierProductData)
            .eq('id', existing.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          // Insert - on doit avoir un product_id, sinon on skip ou on crée un placeholder
          if (!matchedProductId) {
            // Créer quand même le supplier_product sans product_id pour matching manuel
            // Note: cela suppose que product_id est nullable
            unmatchedCount++;
          }
          
          // Pour l'instant, on ne crée que si on a un product_id
          if (matchedProductId) {
            const { error: insertError } = await supabase
              .from('supplier_products')
              .insert({
                ...supplierProductData,
                created_at: new Date().toISOString(),
              });

            if (insertError) {
              throw insertError;
            }
          }
        }

        if (matchedProductId) {
          successCount++;
        }
        
        console.log(`[import-supplier-pricing] Row ${i + 1}: ${matchMethod} match for ${row.supplier_reference}`);
        
      } catch (err) {
        console.error(`[import-supplier-pricing] Error row ${i + 1}:`, err);
        errorCount++;
        errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : 'Erreur inconnue',
        });
      }
    }

    // Logger l'import
    await supabase.from('supplier_import_logs').insert({
      supplier_id: supplierId,
      format,
      filename: filename || null,
      total_rows: data.length,
      success_count: successCount,
      error_count: errorCount,
      unmatched_count: unmatchedCount,
      imported_by: user.id,
      errors: errors.length > 0 ? errors : null,
    });

    console.log(`[import-supplier-pricing] Import complete: ${successCount} success, ${errorCount} errors, ${unmatchedCount} unmatched`);

    return new Response(
      JSON.stringify({
        success: successCount,
        errors: errorCount,
        unmatched: unmatchedCount,
        total: data.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[import-supplier-pricing] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur serveur' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
