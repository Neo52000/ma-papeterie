import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvData, columns } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );


    // Parse CSV rows
    const rows = csvData.trim().split('\n').slice(1); // Skip header
    const results = { success: [], errors: [] };

    for (const row of rows) {
      try {
        const values = row.split(',').map(v => v.trim());
        const rowData: any = {};
        
        columns.forEach((col: string, idx: number) => {
          rowData[col] = values[idx];
        });

        // Use AI to enrich and validate data
        const aiData = await callAI(
          [
            {
              role: 'system',
              content: 'Tu es un assistant expert en enrichissement de données produits. Retourne UNIQUEMENT un objet JSON valide sans texte additionnel.'
            },
            {
              role: 'user',
              content: `Enrichis et valide ces données produit. Retourne un JSON avec: name, description, category (Scolaire/Bureau/Eco/Vintage), price_ht, price_ttc, tva_rate, ean, eco (boolean). Données: ${JSON.stringify(rowData)}`
            }
          ],
          {
            tools: [
              {
                type: "function",
                function: {
                  name: "enrich_product",
                  description: "Enrichit et valide les données produit",
                  parameters: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string", enum: ["Scolaire", "Bureau", "Eco", "Vintage"] },
                      price_ht: { type: "number" },
                      price_ttc: { type: "number" },
                      tva_rate: { type: "number" },
                      ean: { type: "string" },
                      eco: { type: "boolean" }
                    },
                    required: ["name", "category", "price_ttc"],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "enrich_product" } }
          }
        );
        const enrichedData = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);

        // Calculate missing fields
        if (!enrichedData.price_ht && enrichedData.price_ttc) {
          enrichedData.price_ht = enrichedData.price_ttc / (1 + (enrichedData.tva_rate || 20) / 100);
        }

        // Insert or update product
        const { data: product, error } = await supabase
          .from('products')
          .upsert({
            ...enrichedData,
            price: enrichedData.price_ttc,
            is_active: true,
            stock_quantity: parseInt(rowData.stock_quantity || '0'),
          }, { onConflict: 'ean' })
          .select()
          .single();

        if (error) throw error;
        results.success.push({ product: enrichedData.name, id: product.id });
      } catch (err) {
        results.errors.push({ row, error: err.message });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
