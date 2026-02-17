import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ColumnDetection {
  source_column: string;
  mapped_to: string;
  confidence: number;
  sample_values: string[];
}

interface AnalyzeResult {
  detected_columns: ColumnDetection[];
  sample_rows: Record<string, any>[];
  confidence: number;
}

async function verifyAdmin(supabase: any, req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Non autorisé');

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Non autorisé');

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!roles || !['admin', 'super_admin'].includes(roles.role)) {
    throw new Error('Accès refusé');
  }
  return user;
}

async function analyzeWithAI(sampleContent: string): Promise<AnalyzeResult> {
  const systemPrompt = `Tu es un expert en analyse de catalogues fournisseurs de fournitures de bureau et scolaires.
On te donne un échantillon de données brutes d'un fichier fournisseur (CSV, XML, JSON ou texte brut).
Tu dois identifier les colonnes et leur rôle en utilisant le tool analyze_catalog.

Les rôles possibles sont :
- supplier_reference : référence/code article du fournisseur
- product_name : nom/désignation du produit
- supplier_price : prix (HT ou TTC)
- ean : code EAN/code-barres (13 chiffres)
- stock_quantity : quantité en stock
- lead_time_days : délai de livraison en jours
- min_order_quantity : quantité minimum de commande
- ignore : colonne à ignorer

Normalise les prix en nombres décimaux (ex: "12,50 €" → 12.50).
Normalise les EAN en retirant les espaces.`;

  const data = await callAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Voici l'échantillon de données à analyser :\n\n${sampleContent}` },
    ],
    {
      tools: [{
        type: 'function',
        function: {
          name: 'analyze_catalog',
          description: 'Retourne le mapping détecté des colonnes du catalogue fournisseur avec les données normalisées.',
          parameters: {
            type: 'object',
            properties: {
              detected_columns: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source_column: { type: 'string', description: 'Nom de la colonne source' },
                    mapped_to: { type: 'string', enum: ['supplier_reference', 'product_name', 'supplier_price', 'ean', 'stock_quantity', 'lead_time_days', 'min_order_quantity', 'ignore'] },
                    confidence: { type: 'number', description: 'Score de confiance entre 0 et 1' },
                    sample_values: { type: 'array', items: { type: 'string' }, description: '3 valeurs exemple normalisées' },
                  },
                  required: ['source_column', 'mapped_to', 'confidence', 'sample_values'],
                  additionalProperties: false,
                },
              },
              sample_rows: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
                description: 'Les 5 premières lignes normalisées avec les clés mapped_to',
              },
              confidence: { type: 'number', description: 'Score de confiance global entre 0 et 1' },
            },
            required: ['detected_columns', 'sample_rows', 'confidence'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'analyze_catalog' } },
    }
  );
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error('L\'IA n\'a pas retourné de résultat structuré');

  const args = typeof toolCall.function.arguments === 'string'
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;

  return args as AnalyzeResult;
}

async function handleImport(supabase: any, body: any, userId: string) {
  const { supplierId, mapping, data, filename, format } = body;

  if (!supplierId || !data || data.length === 0 || !mapping) {
    throw new Error('Données invalides');
  }

  // Verify supplier exists
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers').select('id, name').eq('id', supplierId).single();
  if (supplierError || !supplier) throw new Error('Fournisseur non trouvé');

  // Load existing products for matching
  const { data: products } = await supabase.from('products').select('id, name, ean');
  const productsByEan = new Map<string, { id: string; name: string }>();
  const productsByName = new Map<string, { id: string; name: string }>();
  if (products) {
    for (const p of products) {
      if (p.ean) productsByEan.set(p.ean, { id: p.id, name: p.name });
      productsByName.set(p.name.toLowerCase().trim(), { id: p.id, name: p.name });
    }
  }

  // Load existing supplier products
  const { data: existingSP } = await supabase
    .from('supplier_products').select('id, product_id, supplier_reference')
    .eq('supplier_id', supplierId);
  const existingByRef = new Map<string, { id: string; product_id: string }>();
  if (existingSP) {
    for (const sp of existingSP) {
      if (sp.supplier_reference) existingByRef.set(sp.supplier_reference, { id: sp.id, product_id: sp.product_id });
    }
  }

  let successCount = 0, errorCount = 0, unmatchedCount = 0;
  const errors: Array<{ row: number; message: string }> = [];

  // mapping is { supplier_reference: "col_name", supplier_price: "col_name", ... }
  for (let i = 0; i < data.length; i++) {
    const rawRow = data[i];
    try {
      const ref = rawRow[mapping.supplier_reference]?.toString() || '';
      const priceStr = rawRow[mapping.supplier_price]?.toString().replace(/[^\d.,\-]/g, '').replace(',', '.') || '0';
      const price = parseFloat(priceStr);
      if (!ref || isNaN(price)) { errorCount++; errors.push({ row: i+1, message: 'Référence ou prix invalide' }); continue; }

      const name = mapping.product_name ? rawRow[mapping.product_name]?.toString() : undefined;
      const ean = mapping.ean ? rawRow[mapping.ean]?.toString().replace(/\s/g, '') : undefined;
      const stock = mapping.stock_quantity ? parseInt(rawRow[mapping.stock_quantity]) : undefined;
      const leadTime = mapping.lead_time_days ? parseInt(rawRow[mapping.lead_time_days]) : undefined;
      const minQty = mapping.min_order_quantity ? parseInt(rawRow[mapping.min_order_quantity]) : undefined;

      // Match product
      let matchedProductId: string | null = null;
      if (ean) { const m = productsByEan.get(ean); if (m) matchedProductId = m.id; }
      if (!matchedProductId && ref) { const e = existingByRef.get(ref); if (e?.product_id) matchedProductId = e.product_id; }
      if (!matchedProductId && name) { const m = productsByName.get(name.toLowerCase().trim()); if (m) matchedProductId = m.id; }

      const spData = {
        supplier_id: supplierId,
        product_id: matchedProductId || null,
        supplier_reference: ref,
        supplier_price: price,
        stock_quantity: isNaN(stock!) ? null : stock ?? null,
        lead_time_days: isNaN(leadTime!) ? null : leadTime ?? null,
        min_order_quantity: isNaN(minQty!) ? null : minQty ?? null,
        source_type: `import_ai_${format || 'unknown'}`,
        updated_at: new Date().toISOString(),
      };

      const existing = existingByRef.get(ref);
      if (existing) {
        await supabase.from('supplier_products').update(spData).eq('id', existing.id);
      } else if (matchedProductId) {
        await supabase.from('supplier_products').insert({ ...spData, created_at: new Date().toISOString() });
      }

      if (matchedProductId) successCount++; else unmatchedCount++;
    } catch (err) {
      errorCount++;
      errors.push({ row: i+1, message: err instanceof Error ? err.message : 'Erreur' });
    }
  }

  // Log import
  await supabase.from('supplier_import_logs').insert({
    supplier_id: supplierId,
    format: format || 'ai',
    filename: filename || null,
    total_rows: data.length,
    success_count: successCount,
    error_count: errorCount,
    unmatched_count: unmatchedCount,
    imported_by: userId,
    errors: errors.length > 0 ? errors : null,
  });

  return { success: successCount, errors: errorCount, unmatched: unmatchedCount, total: data.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const user = await verifyAdmin(supabase, req);
    const body = await req.json();
    const { mode } = body;

    if (mode === 'analyze') {
      const { sampleContent } = body;
      if (!sampleContent) {
        return new Response(JSON.stringify({ error: 'Contenu manquant' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await analyzeWithAI(sampleContent);
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'import') {
      const result = await handleImport(supabase, body, user.id);
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Mode invalide. Utilisez "analyze" ou "import".' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ai-import-catalog] Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    const status = message.includes('Non autorisé') ? 401 : message.includes('Accès refusé') ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
