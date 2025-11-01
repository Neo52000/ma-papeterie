import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorSource {
  name: string;
  baseUrl: string;
  searchPattern: string;
}

// Configuration des concurrents à scraper
const COMPETITORS: CompetitorSource[] = [
  { name: "Bureau Vallée", baseUrl: "https://www.bureau-vallee.fr", searchPattern: "/recherche?q=" },
  { name: "Amazon", baseUrl: "https://www.amazon.fr", searchPattern: "/s?k=" },
  { name: "Cultura", baseUrl: "https://www.cultura.com", searchPattern: "/recherche?q=" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { productIds } = await req.json();

    // Récupérer les produits à comparer
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds || []);

    if (productsError) {
      throw new Error(`Erreur récupération produits: ${productsError.message}`);
    }

    console.log(`Scraping des prix pour ${products?.length || 0} produits...`);

    const results = [];

    for (const product of products || []) {
      console.log(`Analyse du produit: ${product.name}`);
      
      // Simuler le scraping (en production, utiliser un vrai scraper)
      // Pour le moment, on génère des prix aléatoires basés sur le prix du produit
      for (const competitor of COMPETITORS) {
        const basePrice = parseFloat(product.price);
        // Prix concurrent entre -20% et +30% du prix de base
        const variation = (Math.random() * 0.5 - 0.2) * basePrice;
        const competitorPrice = Math.max(0.1, basePrice + variation);
        const priceDifference = competitorPrice - basePrice;
        const priceDifferencePercent = (priceDifference / basePrice) * 100;

        const competitorData = {
          product_id: product.id,
          competitor_name: competitor.name,
          competitor_price: competitorPrice.toFixed(2),
          competitor_url: `${competitor.baseUrl}${competitor.searchPattern}${encodeURIComponent(product.name)}`,
          price_difference: priceDifference.toFixed(2),
          price_difference_percent: priceDifferencePercent.toFixed(2),
          product_ean: product.ean || null,
          scraped_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('competitor_prices')
          .insert(competitorData);

        if (insertError) {
          console.error(`Erreur insertion prix concurrent: ${insertError.message}`);
        } else {
          results.push(competitorData);
        }
      }
    }

    console.log(`Scraping terminé: ${results.length} prix ajoutés`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        scrapedCount: results.length,
        products: products?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur scraping:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
