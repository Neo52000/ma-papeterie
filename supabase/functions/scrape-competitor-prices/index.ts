import { createHandler } from "../_shared/handler.ts";

interface CompetitorSource {
  name: string;
  baseUrl: string;
  searchPattern: string;
}

// Configuration des concurrents à scraper
const COMPETITORS: CompetitorSource[] = [
  { name: "Bureau Vallée", baseUrl: "https://www.bureau-vallee.fr", searchPattern: "/recherche?q=" },
  { name: "JPG", baseUrl: "https://www.jpg.fr", searchPattern: "/recherche?q=" },
  { name: "Welcome Office", baseUrl: "https://www.welcome-office.com", searchPattern: "/search?q=" },
  { name: "Bruneau", baseUrl: "https://www.bruneau.fr", searchPattern: "/recherche?q=" },
];

Deno.serve(createHandler({
  name: "scrape-competitor-prices",
  auth: "secret",
  rateLimit: { prefix: "scrape-competitor", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body }) => {
  const { productIds } = body as { productIds?: string[] };

  // Récupérer les produits à comparer
  const { data: products, error: productsError } = await supabaseAdmin
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

      const { error: insertError } = await supabaseAdmin
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

  return {
    success: true,
    scrapedCount: results.length,
    products: products?.length || 0,
  };
}));
