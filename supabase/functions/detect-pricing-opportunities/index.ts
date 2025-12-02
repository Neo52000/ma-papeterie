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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting pricing opportunities detection...');

    // Fetch active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price_ht, margin_percent')
      .eq('is_active', true);

    if (productsError) throw productsError;

    let alertsCreated = 0;
    const alerts = [];

    for (const product of products || []) {
      // Get latest competitor prices for this product
      const { data: competitorPrices } = await supabase
        .from('competitor_prices')
        .select('*')
        .eq('product_id', product.id)
        .order('scraped_at', { ascending: false })
        .limit(10);

      if (!competitorPrices || competitorPrices.length === 0) continue;

      // Group by competitor to get latest price for each
      const latestByCompetitor = new Map();
      competitorPrices.forEach(cp => {
        if (!latestByCompetitor.has(cp.competitor_name)) {
          latestByCompetitor.set(cp.competitor_name, cp);
        }
      });

      // Check each competitor
      for (const [competitorName, competitorData] of latestByCompetitor) {
        const ourPrice = product.price_ht || 0;
        const theirPrice = competitorData.competitor_price;
        const priceDiff = ourPrice - theirPrice;
        const priceDiffPercent = ourPrice > 0 ? (priceDiff / ourPrice) * 100 : 0;

        // Alert if competitor price is lower than ours
        if (theirPrice < ourPrice && priceDiffPercent > 5) {
          const severity = priceDiffPercent > 20 ? 'critical' : priceDiffPercent > 10 ? 'high' : 'medium';
          
          alerts.push({
            alert_type: 'competitor_lower_price',
            severity,
            product_id: product.id,
            competitor_name: competitorName,
            our_price: ourPrice,
            competitor_price: theirPrice,
            price_difference: priceDiff,
            price_difference_percent: priceDiffPercent,
            suggested_action: `Considérer une baisse de prix de ${Math.abs(priceDiff).toFixed(2)}€ pour rester compétitif`,
            details: {
              product_name: product.name,
              competitor_url: competitorData.competitor_url,
              scraped_at: competitorData.scraped_at
            }
          });
        }

        // Alert for pricing opportunity (we're much cheaper)
        if (theirPrice > ourPrice && priceDiffPercent < -15) {
          alerts.push({
            alert_type: 'pricing_opportunity',
            severity: 'medium',
            product_id: product.id,
            competitor_name: competitorName,
            our_price: ourPrice,
            competitor_price: theirPrice,
            price_difference: priceDiff,
            price_difference_percent: priceDiffPercent,
            suggested_action: `Opportunité d'augmenter le prix jusqu'à ${(theirPrice * 0.95).toFixed(2)}€ pour améliorer la marge`,
            details: {
              product_name: product.name,
              potential_margin_gain: ((theirPrice * 0.95) - ourPrice).toFixed(2)
            }
          });
        }
      }

      // Check margin threshold
      if (product.margin_percent !== null && product.margin_percent < 15) {
        alerts.push({
          alert_type: 'margin_below_threshold',
          severity: product.margin_percent < 10 ? 'high' : 'medium',
          product_id: product.id,
          our_price: product.price_ht,
          suggested_action: `Marge actuelle de ${product.margin_percent.toFixed(1)}% est inférieure au seuil recommandé de 15%`,
          details: {
            product_name: product.name,
            current_margin: product.margin_percent,
            threshold: 15
          }
        });
      }
    }

    // Insert alerts into database (only new unique alerts)
    if (alerts.length > 0) {
      // Check for existing similar alerts from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      for (const alert of alerts) {
        const { data: existing } = await supabase
          .from('pricing_alerts')
          .select('id')
          .eq('product_id', alert.product_id)
          .eq('alert_type', alert.alert_type)
          .eq('is_resolved', false)
          .gte('created_at', yesterday)
          .limit(1);

        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabase
            .from('pricing_alerts')
            .insert(alert);

          if (!insertError) {
            alertsCreated++;
          } else {
            console.error('Error inserting alert:', insertError);
          }
        }
      }
    }

    console.log(`Detection complete. ${alertsCreated} new alerts created out of ${alerts.length} opportunities found.`);

    return new Response(
      JSON.stringify({
        success: true,
        alertsCreated,
        totalOpportunities: alerts.length,
        message: `${alertsCreated} nouvelles alertes créées`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in detect-pricing-opportunities:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});