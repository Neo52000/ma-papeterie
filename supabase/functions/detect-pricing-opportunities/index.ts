import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callAI } from "../_shared/ai-client.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { mode = 'full' } = await req.json().catch(() => ({}));

    console.log('Starting advanced pricing opportunities detection...');

    // Fetch active products with pricing
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, price_ht, price_ttc, margin_percent, category, ean')
      .eq('is_active', true);
    if (productsError) throw productsError;

    // Fetch current best competitor prices
    const { data: currentPrices } = await supabase
      .from('price_current')
      .select('*, competitors(name)');

    // Fetch price snapshots for trend analysis (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: priceHistory } = await supabase
      .from('price_snapshots')
      .select('product_id, price, scraped_at, competitor_id, competitors(name)')
      .gte('scraped_at', thirtyDaysAgo)
      .order('scraped_at', { ascending: true });

    // Fetch competitor prices from competitor_prices table too
    const { data: competitorPrices } = await supabase
      .from('competitor_prices')
      .select('*')
      .order('scraped_at', { ascending: false });

    // Build comprehensive analysis data
    const analysisProducts = products?.map(product => {
      const bestPrice = currentPrices?.find(cp => cp.product_id === product.id);
      const history = priceHistory?.filter(ph => ph.product_id === product.id) || [];
      const latestCompetitors = competitorPrices?.filter(cp => cp.product_id === product.id) || [];

      // Calculate price trends
      const competitorTrends: Record<string, { prices: number[]; dates: string[] }> = {};
      history.forEach(h => {
        const name = (h as any).competitors?.name || h.competitor_id;
        if (!competitorTrends[name]) competitorTrends[name] = { prices: [], dates: [] };
        competitorTrends[name].prices.push(h.price);
        competitorTrends[name].dates.push(h.scraped_at);
      });

      return {
        id: product.id,
        name: product.name,
        ourPrice: product.price_ht || product.price,
        ourPriceTTC: product.price_ttc || product.price,
        margin: product.margin_percent,
        category: product.category,
        bestCompetitorPrice: bestPrice?.best_price,
        bestCompetitor: bestPrice?.competitors?.name,
        competitorPrices: latestCompetitors.slice(0, 5).map(cp => ({
          competitor: cp.competitor_name,
          price: cp.competitor_price,
          diff: cp.price_difference_percent,
        })),
        pricetrends: Object.entries(competitorTrends).map(([name, data]) => ({
          competitor: name,
          priceCount: data.prices.length,
          avgPrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
          minPrice: Math.min(...data.prices),
          maxPrice: Math.max(...data.prices),
          trend: data.prices.length >= 2 
            ? (data.prices[data.prices.length - 1] - data.prices[0]) / data.prices[0] * 100 
            : 0,
        })),
      };
    }).filter(p => p.competitorPrices.length > 0 || p.bestCompetitorPrice);

    // Standard rule-based alerts
    let alertsCreated = 0;
    const standardAlerts = [];

    for (const product of products || []) {
      const competitors = competitorPrices?.filter(cp => cp.product_id === product.id) || [];
      const latestByCompetitor = new Map();
      competitors.forEach(cp => {
        if (!latestByCompetitor.has(cp.competitor_name)) {
          latestByCompetitor.set(cp.competitor_name, cp);
        }
      });

      for (const [competitorName, competitorData] of latestByCompetitor) {
        const ourPrice = product.price_ht || 0;
        const theirPrice = competitorData.competitor_price;
        const priceDiffPercent = ourPrice > 0 ? ((ourPrice - theirPrice) / ourPrice) * 100 : 0;

        if (theirPrice < ourPrice && priceDiffPercent > 5) {
          const severity = priceDiffPercent > 20 ? 'critical' : priceDiffPercent > 10 ? 'high' : 'medium';
          standardAlerts.push({
            alert_type: 'competitor_lower_price',
            severity,
            product_id: product.id,
            competitor_name: competitorName,
            our_price: ourPrice,
            competitor_price: theirPrice,
            price_difference: ourPrice - theirPrice,
            price_difference_percent: priceDiffPercent,
            suggested_action: `Baisse de ${Math.abs(ourPrice - theirPrice).toFixed(2)}€ recommandée`,
            details: { product_name: product.name },
          });
        }

        if (theirPrice > ourPrice && priceDiffPercent < -15) {
          standardAlerts.push({
            alert_type: 'pricing_opportunity',
            severity: 'medium',
            product_id: product.id,
            competitor_name: competitorName,
            our_price: ourPrice,
            competitor_price: theirPrice,
            price_difference: ourPrice - theirPrice,
            price_difference_percent: priceDiffPercent,
            suggested_action: `Hausse possible jusqu'à ${(theirPrice * 0.95).toFixed(2)}€`,
            details: { product_name: product.name, potential_gain: ((theirPrice * 0.95) - ourPrice).toFixed(2) },
          });
        }
      }

      if (product.margin_percent !== null && product.margin_percent < 15) {
        standardAlerts.push({
          alert_type: 'margin_below_threshold',
          severity: product.margin_percent < 10 ? 'high' : 'medium',
          product_id: product.id,
          our_price: product.price_ht,
          suggested_action: `Marge ${product.margin_percent?.toFixed(1)}% < seuil 15%`,
          details: { product_name: product.name, current_margin: product.margin_percent },
        });
      }
    }

    // Insert standard alerts (dedup 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    for (const alert of standardAlerts) {
      const { data: existing } = await supabase
        .from('pricing_alerts')
        .select('id')
        .eq('product_id', alert.product_id)
        .eq('alert_type', alert.alert_type)
        .eq('is_resolved', false)
        .gte('created_at', yesterday)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error: insertError } = await supabase.from('pricing_alerts').insert(alert);
        if (!insertError) alertsCreated++;
      }
    }

    // AI-powered advanced insights (only if we have data)
    let aiInsights: any[] = [];
    if (analysisProducts && analysisProducts.length > 0) {
      try {
        const aiData = await callAI([
              {
                role: 'system',
                content: `Tu es un expert en stratégie de pricing pour une papeterie e-commerce.
Analyse les données de prix et concurrents pour identifier des opportunités stratégiques.
Génère des insights actionnables. Réponds UNIQUEMENT en JSON valide :
{
  "insights": [
    {
      "productId": "uuid",
      "type": "price_increase" | "price_decrease" | "margin_alert" | "competitor_gap" | "trend",
      "title": "string court",
      "description": "explication détaillée",
      "priority": "low" | "medium" | "high" | "critical",
      "suggestedPrice": number | null,
      "currentPrice": number,
      "potentialGain": number | null,
      "competitorData": {} | null
    }
  ],
  "summary": "résumé stratégique global"
}`
              },
              {
                role: 'user',
                content: `Analyse ces ${analysisProducts.length} produits avec données concurrentielles :\n${JSON.stringify(analysisProducts.slice(0, 30), null, 2)}`
              }
            ]);

        {
          const aiContent = aiData.choices[0].message.content;
          const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```\n([\s\S]*?)\n```/);
          const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : aiContent);
          aiInsights = parsed.insights || [];

          // Save AI insights
          if (aiInsights.length > 0) {
            // Clear old 'new' insights
            await supabase.from('pricing_insights').delete().eq('status', 'new');

            const rows = aiInsights.map((i: any) => ({
              product_id: i.productId,
              insight_type: i.type || 'trend',
              title: i.title,
              description: i.description,
              priority: i.priority || 'medium',
              suggested_price: i.suggestedPrice,
              current_price: i.currentPrice,
              potential_gain: i.potentialGain,
              competitor_data: i.competitorData,
              status: 'new',
            }));

            await supabase.from('pricing_insights').insert(rows);
          }
        }
      } catch (aiError) {
        console.error('AI analysis error (non-blocking):', aiError);
      }
    }

    // Log execution
    await supabase.from('agent_logs').insert({
      agent_name: 'detect-pricing-opportunities',
      action: 'full_analysis',
      status: 'success',
      output_data: { alertsCreated, standardAlerts: standardAlerts.length, aiInsights: aiInsights.length },
    });

    console.log(`Done. ${alertsCreated} alerts, ${aiInsights.length} AI insights.`);

    return new Response(JSON.stringify({
      success: true,
      alertsCreated,
      totalOpportunities: standardAlerts.length,
      aiInsightsGenerated: aiInsights.length,
      message: `${alertsCreated} alertes + ${aiInsights.length} insights IA générés`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
