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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ruleId } = await req.json();

    // Récupérer les règles actives (soit la règle spécifique, soit toutes)
    let rulesQuery = supabase
      .from('pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (ruleId) {
      rulesQuery = rulesQuery.eq('id', ruleId);
    }

    const { data: rules, error: rulesError } = await rulesQuery;

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucune règle active trouvée', adjustmentsCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Application de ${rules.length} règle(s) de pricing...`);

    let totalAdjustments = 0;

    for (const rule of rules) {
      console.log(`Traitement de la règle: ${rule.name}`);

      // Récupérer les produits concernés par cette règle
      let productsQuery = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (rule.category) {
        productsQuery = productsQuery.eq('category', rule.category);
      }

      if (rule.product_ids && rule.product_ids.length > 0) {
        productsQuery = productsQuery.in('id', rule.product_ids);
      }

      const { data: products, error: productsError } = await productsQuery;

      if (productsError) throw productsError;
      if (!products || products.length === 0) continue;

      console.log(`${products.length} produits à analyser pour cette règle`);

      for (const product of products) {
        try {
          // Récupérer les prix concurrents
          const { data: competitorPrices } = await supabase
            .from('competitor_prices')
            .select('*')
            .eq('product_id', product.id)
            .order('scraped_at', { ascending: false });

          // Récupérer le prix fournisseur (le moins cher)
          const { data: supplierProducts } = await supabase
            .from('supplier_products')
            .select('*')
            .eq('product_id', product.id)
            .order('supplier_price', { ascending: true });

          const supplierPrice = supplierProducts?.[0]?.supplier_price;

          // Calculer le prix moyen des concurrents (derniers prix de chaque concurrent)
          let avgCompetitorPrice: number | null = null;
          if (competitorPrices && competitorPrices.length > 0) {
            const latestPrices = new Map();
            for (const cp of competitorPrices) {
              if (!latestPrices.has(cp.competitor_name)) {
                latestPrices.set(cp.competitor_name, parseFloat(cp.competitor_price));
              }
            }
            const prices = Array.from(latestPrices.values());
            if (prices.length >= (rule.min_competitor_count || 1)) {
              avgCompetitorPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            }
          }

          // Calculer le nouveau prix selon la stratégie
          let newPriceHt: number | null = null;
          let reason = '';

          const currentPrice = parseFloat(product.price_ht || product.price || 0);
          if (currentPrice === 0) continue;

          switch (rule.strategy) {
            case 'margin_target':
              if (supplierPrice && rule.target_margin_percent) {
                newPriceHt = supplierPrice * (1 + rule.target_margin_percent / 100);
                reason = `Marge cible de ${rule.target_margin_percent}%`;
              }
              break;

            case 'competitor_match':
              if (avgCompetitorPrice) {
                newPriceHt = avgCompetitorPrice + (rule.competitor_offset_fixed || 0);
                newPriceHt *= (1 + (rule.competitor_offset_percent || 0) / 100);
                reason = `Alignement sur prix concurrent moyen: ${avgCompetitorPrice.toFixed(2)}€`;
              }
              break;

            case 'competitor_undercut':
              if (avgCompetitorPrice) {
                newPriceHt = avgCompetitorPrice + (rule.competitor_offset_fixed || -0.5);
                newPriceHt *= (1 + (rule.competitor_offset_percent || -5) / 100);
                reason = `Sous-coupe concurrent moyen: ${avgCompetitorPrice.toFixed(2)}€`;
              }
              break;

            case 'hybrid':
              if (supplierPrice && rule.target_margin_percent && avgCompetitorPrice) {
                const marginPrice = supplierPrice * (1 + rule.target_margin_percent / 100);
                const competitorPrice = avgCompetitorPrice + (rule.competitor_offset_fixed || 0);
                // Prendre le prix qui respecte la marge mais reste compétitif
                newPriceHt = Math.min(
                  marginPrice,
                  competitorPrice * (1 + (rule.competitor_offset_percent || 0) / 100)
                );
                reason = `Hybride: marge ${rule.target_margin_percent}% vs concurrent ${avgCompetitorPrice.toFixed(2)}€`;
              }
              break;
          }

          if (!newPriceHt) continue;

          // Appliquer les limites de prix
          if (rule.min_price_ht && newPriceHt < rule.min_price_ht) {
            newPriceHt = rule.min_price_ht;
            reason += ' (prix min appliqué)';
          }
          if (rule.max_price_ht && newPriceHt > rule.max_price_ht) {
            newPriceHt = rule.max_price_ht;
            reason += ' (prix max appliqué)';
          }

          // Vérifier le changement maximum
          const priceChangePercent = ((newPriceHt - currentPrice) / currentPrice) * 100;
          if (Math.abs(priceChangePercent) > (rule.max_price_change_percent || 10)) {
            console.log(`Changement trop important pour ${product.name}: ${priceChangePercent.toFixed(2)}%`);
            continue;
          }

          // Si le changement est minime, ignorer
          if (Math.abs(priceChangePercent) < 0.5) continue;

          // Calculer les marges
          const oldMargin = supplierPrice ? ((currentPrice - supplierPrice) / currentPrice) * 100 : null;
          const newMargin = supplierPrice ? ((newPriceHt - supplierPrice) / newPriceHt) * 100 : null;

          // Vérifier les contraintes de marge
          if (newMargin !== null) {
            if (rule.min_margin_percent && newMargin < rule.min_margin_percent) {
              console.log(`Marge trop faible pour ${product.name}: ${newMargin.toFixed(2)}%`);
              continue;
            }
            if (rule.max_margin_percent && newMargin > rule.max_margin_percent) {
              newPriceHt = supplierPrice * (1 + rule.max_margin_percent / 100);
              reason += ' (marge max appliquée)';
            }
          }

          // Créer l'ajustement
          const adjustment = {
            product_id: product.id,
            pricing_rule_id: rule.id,
            old_price_ht: currentPrice,
            new_price_ht: newPriceHt,
            price_change_percent: priceChangePercent,
            old_margin_percent: oldMargin,
            new_margin_percent: newMargin,
            competitor_avg_price: avgCompetitorPrice,
            supplier_price: supplierPrice,
            reason: reason,
            status: rule.require_approval ? 'pending' : 'approved',
          };

          const { error: insertError } = await supabase
            .from('price_adjustments')
            .insert(adjustment);

          if (insertError) {
            console.error(`Erreur insertion ajustement pour ${product.name}:`, insertError);
          } else {
            totalAdjustments++;

            // Si pas d'approbation requise, appliquer directement
            if (!rule.require_approval) {
              await supabase
                .from('products')
                .update({ price_ht: newPriceHt })
                .eq('id', product.id);
            }
          }
        } catch (productError) {
          console.error(`Erreur traitement produit ${product.name}:`, productError);
        }
      }

      // Mettre à jour la date de dernière application
      await supabase
        .from('pricing_rules')
        .update({ last_applied_at: new Date().toISOString() })
        .eq('id', rule.id);
    }

    console.log(`Calcul terminé: ${totalAdjustments} ajustements créés`);

    return new Response(
      JSON.stringify({
        success: true,
        adjustmentsCount: totalAdjustments,
        rulesApplied: rules.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur calcul ajustements:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
