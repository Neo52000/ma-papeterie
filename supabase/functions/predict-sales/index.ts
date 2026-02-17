import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
    const { productId, analysisType } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les données historiques
    const { data: adjustments } = await supabase
      .from('price_adjustments')
      .select('*, products(name, category)')
      .eq('status', 'applied')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(product_id, quantity, product_price)')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: competitorPrices } = await supabase
      .from('competitor_prices')
      .select('*')
      .order('scraped_at', { ascending: false })
      .limit(200);

    const { data: products } = await supabase
      .from('products')
      .select('*');

    // Préparer le contexte pour l'IA
    const context = {
      adjustments: adjustments || [],
      orders: orders || [],
      competitorPrices: competitorPrices || [],
      products: products || [],
      productId,
      analysisType,
    };

    let systemPrompt = "";
    let userPrompt = "";

    if (analysisType === 'forecast') {
      systemPrompt = `Tu es un expert en analyse de données de vente et prévisions. 
      Analyse l'historique des ventes et des ajustements de prix pour générer des prévisions précises.
      Identifie les tendances, la saisonnalité, et les corrélations entre prix et volumes de vente.`;
      
      userPrompt = `Analyse ces données historiques et génère des prévisions de ventes pour les 3 prochains mois:
      
      Données: ${JSON.stringify(context)}
      
      Fournis:
      1. Prévisions mensuelles de volume de ventes
      2. Revenus prévisionnels
      3. Facteurs clés influençant les ventes
      4. Niveau de confiance des prévisions
      5. Recommandations pour améliorer les ventes`;
    } else {
      systemPrompt = `Tu es un expert en stratégie de pricing et optimisation des marges.
      Analyse les données de prix, marges, concurrence et ventes pour recommander des ajustements optimaux.
      Maximise les marges tout en restant compétitif.`;
      
      userPrompt = `Analyse ces données et propose des optimisations de prix pour maximiser les marges:
      
      Données: ${JSON.stringify(context)}
      
      Fournis:
      1. Produits avec opportunités d'augmentation de prix
      2. Produits nécessitant une baisse de prix
      3. Prix optimaux recommandés par produit
      4. Impact estimé sur les marges
      5. Risques et opportunités
      6. Stratégie de pricing recommandée`;
    }

    // Appel IA avec tool calling pour structurer la sortie
    const aiData = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_analysis',
              description: 'Fournir l\'analyse complète des prévisions ou optimisations',
              parameters: {
                type: 'object',
                properties: {
                  summary: { type: 'string', description: 'Résumé exécutif de l\'analyse' },
                  metrics: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        value: { type: 'string' },
                        trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                        description: { type: 'string' }
                      },
                      required: ['name', 'value', 'trend']
                    }
                  },
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productName: { type: 'string' },
                        currentPrice: { type: 'number' },
                        recommendedPrice: { type: 'number' },
                        expectedMarginChange: { type: 'number' },
                        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                        reasoning: { type: 'string' }
                      },
                      required: ['productName', 'currentPrice', 'recommendedPrice', 'reasoning']
                    }
                  },
                  forecasts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        month: { type: 'string' },
                        predictedSales: { type: 'number' },
                        predictedRevenue: { type: 'number' },
                        confidence: { type: 'string', enum: ['low', 'medium', 'high'] }
                      },
                      required: ['month', 'predictedSales', 'predictedRevenue']
                    }
                  },
                  insights: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high'] }
                      },
                      required: ['title', 'description', 'priority']
                    }
                  }
                },
                required: ['summary', 'insights'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_analysis' } }
      }
    );
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in predict-sales function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
