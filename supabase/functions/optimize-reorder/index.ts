import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callAI } from "../_shared/ai-client.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";
import { requireAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const authResult = await requireAdmin(req, corsHeaders);
  if ('error' in authResult) return authResult.error;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { mode = 'analyze' } = await req.json().catch(() => ({}));

    // Fetch products with stock info
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock_alert, reorder_quantity, price_ht, category')
      .eq('is_active', true);
    if (productsError) throw productsError;

    // Fetch supplier products
    const { data: supplierProducts } = await supabase
      .from('supplier_products')
      .select('*, suppliers(name, is_active, minimum_order_amount)');

    // Fetch recent order items for sales velocity (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSales } = await supabase
      .from('order_items')
      .select('product_id, quantity, created_at')
      .gte('created_at', ninetyDaysAgo);

    // Fetch multi-location stock
    const { data: stockLocations } = await supabase
      .from('product_stock_locations')
      .select('product_id, location_name, location_type, stock_quantity');

    // Calculate sales velocity per product
    const salesVelocity: Record<string, { totalSold: number; avgPerDay: number; daysOfData: number }> = {};
    if (recentSales) {
      for (const sale of recentSales) {
        if (!salesVelocity[sale.product_id]) {
          salesVelocity[sale.product_id] = { totalSold: 0, avgPerDay: 0, daysOfData: 90 };
        }
        salesVelocity[sale.product_id].totalSold += sale.quantity;
      }
      for (const [pid, v] of Object.entries(salesVelocity)) {
        v.avgPerDay = v.totalSold / 90;
      }
    }

    // Build analysis data
    const analysisData = products?.map(product => {
      const suppliers = supplierProducts?.filter(sp => sp.product_id === product.id) || [];
      const velocity = salesVelocity[product.id] || { totalSold: 0, avgPerDay: 0 };
      const locations = stockLocations?.filter(sl => sl.product_id === product.id) || [];
      const totalMultiStock = locations.reduce((sum, l) => sum + (l.stock_quantity || 0), 0);
      const daysOfStock = velocity.avgPerDay > 0 ? (product.stock_quantity || 0) / velocity.avgPerDay : 999;

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        currentStock: product.stock_quantity || 0,
        multiLocationStock: totalMultiStock,
        minStockAlert: product.min_stock_alert || 5,
        reorderQuantity: product.reorder_quantity || 10,
        salesVelocity: {
          totalSold90d: velocity.totalSold,
          avgPerDay: Math.round(velocity.avgPerDay * 100) / 100,
          estimatedDaysLeft: Math.round(daysOfStock),
        },
        suppliers: suppliers.map(sp => ({
          name: sp.suppliers?.name,
          price: sp.supplier_price,
          stock: sp.stock_quantity,
          leadTime: sp.lead_time_days,
          isPreferred: sp.is_preferred,
          isActive: sp.suppliers?.is_active,
          minOrder: sp.suppliers?.minimum_order_amount || 0,
        })),
      };
    }).filter(p => p.salesVelocity.estimatedDaysLeft < 30 || p.currentStock <= (p.minStockAlert * 1.5));

    if (!analysisData || analysisData.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Aucun produit ne nécessite de réassort pour le moment',
        recommendations: [],
        savedCount: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call AI for smart recommendations
    const aiData = await callAI([
          {
            role: 'system',
            content: `Tu es un expert en gestion de stocks et optimisation des achats pour une papeterie.
Analyse les données de stock, vélocité de ventes et fournisseurs pour générer des recommandations de réassort intelligentes.
Considère : vélocité de vente, jours de stock restants, délais fournisseurs, prix d'achat, quantités minimales, fournisseur préféré.
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "recommendations": [
    {
      "productId": "uuid",
      "productName": "string",
      "currentStock": number,
      "suggestedQuantity": number,
      "urgency": "high" | "medium" | "low",
      "bestSupplier": "string",
      "estimatedCost": number,
      "reasoning": "string (explication courte)"
    }
  ],
  "summary": "string (résumé global)"
}`
          },
          {
            role: 'user',
            content: `Analyse ces ${analysisData.length} produits nécessitant un réassort :\n${JSON.stringify(analysisData, null, 2)}`
          }
        ]);

    const aiContent = aiData.choices[0].message.content;

    let parsed;
    try {
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[1] : aiContent);
    } catch {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    // Save suggestions to DB if mode is 'save'
    let savedCount = 0;
    if (mode === 'save' && parsed.recommendations?.length > 0) {
      // Clear old pending suggestions
      await supabase.from('reorder_suggestions').delete().eq('status', 'pending');

      const rows = parsed.recommendations.map((r: any) => ({
        product_id: r.productId,
        product_name: r.productName,
        current_stock: r.currentStock || 0,
        suggested_quantity: r.suggestedQuantity,
        urgency: r.urgency || 'medium',
        best_supplier: r.bestSupplier,
        estimated_cost: r.estimatedCost,
        reasoning: r.reasoning,
        status: 'pending',
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('reorder_suggestions')
        .insert(rows)
        .select();

      if (insertError) console.error('Insert error:', insertError);
      savedCount = inserted?.length || 0;
    }

    // Log execution
    await supabase.from('agent_logs').insert({
      agent_name: 'optimize-reorder',
      action: mode === 'save' ? 'generate_and_save' : 'analyze',
      status: 'success',
      output_data: { recommendationCount: parsed.recommendations?.length || 0, savedCount },
    });

    return new Response(JSON.stringify({
      success: true,
      ...parsed,
      savedCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
