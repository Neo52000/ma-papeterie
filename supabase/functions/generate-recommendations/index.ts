import { callAI } from "../_shared/ai-client.ts";
import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "generate-recommendations",
  auth: "auth",
  rateLimit: { prefix: "gen-reco", max: 15, windowMs: 60_000 },
}, async ({ supabaseAdmin, userId }) => {
  // Get user order history
  const { data: orders, error: ordersError } = await supabaseAdmin
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
  const { data: products, error: productsError } = await supabaseAdmin
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
  await supabaseAdmin
    .from('customer_recommendations')
    .delete()
    .eq('user_id', userId);

  // Insert new recommendations
  const { error: insertError } = await supabaseAdmin
    .from('customer_recommendations')
    .insert(recommendations.map((rec: any) => ({
      user_id: userId,
      product_id: rec.product_id,
      recommendation_score: rec.score,
      recommendation_reason: rec.reason,
    })));

  if (insertError) throw insertError;

  return {
    success: true,
    recommendations
  };
}));
