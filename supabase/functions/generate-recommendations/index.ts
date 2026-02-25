import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callAI } from "../_shared/ai-client.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user order history
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        order_items (
          product_name,
          quantity
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) throw ordersError;

    // Get all available products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, price')
      .eq('is_active', true)
      .limit(50);

    if (productsError) throw productsError;

    // Use AI to generate recommendations
    const aiData = await callAI(
      [
        {
          role: 'system',
          content: 'Tu es un expert en recommandations produits. Analyse l\'historique d\'achat et recommande 5 produits pertinents.'
        },
        {
          role: 'user',
          content: `Historique: ${JSON.stringify(orders)}. Produits disponibles: ${JSON.stringify(products)}. Recommande 5 produits avec scores et raisons.`
        }
      ],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "generate_recommendations",
              description: "Génère des recommandations produits personnalisées",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_id: { type: "string" },
                        score: { type: "number" },
                        reason: { type: "string" }
                      },
                      required: ["product_id", "score", "reason"]
                    }
                  }
                },
                required: ["recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } }
      }
    );
    const recommendations = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments).recommendations;

    // Delete old recommendations
    await supabase
      .from('customer_recommendations')
      .delete()
      .eq('user_id', userId);

    // Insert new recommendations
    const { error: insertError } = await supabase
      .from('customer_recommendations')
      .insert(recommendations.map(rec => ({
        user_id: userId,
        product_id: rec.product_id,
        recommendation_score: rec.score,
        recommendation_reason: rec.reason,
      })));

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true, 
      recommendations 
    }), {
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
