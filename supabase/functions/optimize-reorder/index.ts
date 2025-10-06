import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all products with their stock levels
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) throw productsError;

    // Fetch all supplier products with supplier info
    const { data: supplierProducts, error: spError } = await supabase
      .from('supplier_products')
      .select(`
        *,
        suppliers (*),
        products (*)
      `);

    if (spError) throw spError;

    // Prepare data for AI analysis
    const analysisData = products?.map(product => {
      const suppliers = supplierProducts?.filter(sp => sp.product_id === product.id) || [];
      return {
        id: product.id,
        name: product.name,
        currentStock: product.stock_quantity,
        suppliers: suppliers.map(sp => ({
          name: sp.suppliers?.name,
          price: sp.supplier_price,
          stock: sp.stock_quantity,
          leadTime: sp.lead_time_days,
          isPreferred: sp.is_preferred,
          minOrder: sp.suppliers?.minimum_order_amount || 0,
        })),
      };
    });

    // Call Lovable AI for optimization
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en gestion de stocks et optimisation des commandes fournisseurs. 
            Analyse les données de stock et suggère des commandes de réassort optimales.
            Considère : prix, stocks disponibles, délais de livraison, fournisseurs préférés, montants minimum de commande.
            Réponds en JSON avec cette structure :
            {
              "recommendations": [
                {
                  "productId": "uuid",
                  "productName": "string",
                  "currentStock": number,
                  "suggestedOrder": number,
                  "urgency": "high|medium|low",
                  "bestSupplier": "string",
                  "estimatedCost": number,
                  "reasoning": "string"
                }
              ],
              "totalEstimatedCost": number,
              "summary": "string"
            }`
          },
          {
            role: 'user',
            content: `Analyse ces données de stock et génère des recommandations de réassort :\n${JSON.stringify(analysisData, null, 2)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de taux dépassée, veuillez réessayer plus tard.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Crédit insuffisant, veuillez ajouter des crédits à votre workspace Lovable AI.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Parse AI response
    let recommendations;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      recommendations = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in optimize-reorder:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
