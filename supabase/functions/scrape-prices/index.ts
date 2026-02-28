import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireApiSecret } from "../_shared/auth.ts";

// Rate limit configuration par domaine (en ms)
const DEFAULT_RATE_LIMIT_MS = 4000;

// Sélecteurs de prix par concurrent (à configurer en base)
const PRICE_SELECTORS: Record<string, string[]> = {
  'bureau-vallee.fr': ['.product-price .price', '.pdp-price', '[data-price]'],
  'jpg.fr': ['.product-price', '.price-final', '.price'],
  'welcome-office.com': ['.product-price-value', '.price'],
  'bruneau.fr': ['.product-price', '.price-value'],
  'default': ['.price', '[itemprop="price"]', '.product-price', '[data-price]'],
};

interface CompetitorMap {
  id: string;
  product_id: string;
  competitor_id: string;
  product_url: string;
  pack_size: number;
  active: boolean;
  competitor?: {
    id: string;
    name: string;
    base_url: string;
    enabled: boolean;
    price_selector: string | null;
    rate_limit_ms: number | null;
  };
}

interface PriceSnapshot {
  product_id: string;
  competitor_id: string;
  pack_size: number;
  price: number;
  currency: string;
  source_url: string;
  is_suspect: boolean;
}

// Extraire le domaine d'une URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

// Extraire le prix depuis le HTML
function extractPriceFromHtml(html: string, selectors: string[]): number | null {
  // Patterns pour trouver le prix dans le HTML
  const pricePatterns = [
    /(?:prix|price|€)\s*:?\s*(\d+[.,]\d{2})/gi,
    /(\d+[.,]\d{2})\s*(?:€|EUR)/gi,
    /data-price=["'](\d+[.,]\d+)["']/gi,
    /itemprop=["']price["'][^>]*content=["'](\d+[.,]\d+)["']/gi,
    /class=["'][^"']*price[^"']*["'][^>]*>([^<]*\d+[.,]\d{2}[^<]*)</gi,
  ];

  for (const pattern of pricePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const priceStr = match[1] || match[0];
      const cleanPrice = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
      const price = parseFloat(cleanPrice);
      if (!isNaN(price) && price > 0 && price < 10000) {
        return price;
      }
    }
  }

  return null;
}

// Calculer la médiane d'un tableau de nombres
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Vérifier si le prix est suspect (< 35% de la médiane)
function isPriceSuspect(price: number, median: number | null): boolean {
  if (median === null) return false;
  return price < median * 0.35;
}

// Attendre un délai
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const secretError = requireApiSecret(req, corsHeaders);
  if (secretError) return secretError;

  const startTime = Date.now();
  let runId: string | null = null;
  let offersSaved = 0;
  let errorsCount = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier si on doit exécuter (logique 24-36h)
    const { data: lastRun } = await supabase
      .from('scrape_runs')
      .select('*')
      .eq('status', 'success')
      .order('finished_at', { ascending: false })
      .limit(1)
      .single();

    const body = await req.json().catch(() => ({}));
    const forceRun = body.force === true;
    const specificProductIds = body.productIds as string[] | undefined;

    if (lastRun && !forceRun && !specificProductIds) {
      const lastRunTime = new Date(lastRun.finished_at).getTime();
      const hoursSinceLastRun = (Date.now() - lastRunTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastRun < 24) {
        console.log(`Dernier scraping réussi il y a ${hoursSinceLastRun.toFixed(1)}h - skip`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true, 
            reason: `Dernier scraping il y a ${hoursSinceLastRun.toFixed(1)}h (< 24h)` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Créer une entrée de run
    const { data: newRun, error: runError } = await supabase
      .from('scrape_runs')
      .insert({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError) throw runError;
    runId = newRun.id;
    console.log(`Démarrage scrape run ${runId}`);

    // Charger les mappings actifs avec les infos concurrents
    let query = supabase
      .from('competitor_product_map')
      .select(`
        *,
        competitor:competitors(*)
      `)
      .eq('active', true);

    if (specificProductIds && specificProductIds.length > 0) {
      query = query.in('product_id', specificProductIds);
    }

    const { data: mappings, error: mappingsError } = await query;

    if (mappingsError) throw mappingsError;

    // Filtrer les mappings avec des concurrents activés
    const activeMappings = (mappings as CompetitorMap[])?.filter(
      m => m.competitor?.enabled
    ) || [];

    console.log(`${activeMappings.length} mappings actifs à scraper`);

    // Grouper par domaine pour rate limiting
    const byDomain: Record<string, CompetitorMap[]> = {};
    for (const mapping of activeMappings) {
      const domain = extractDomain(mapping.product_url);
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(mapping);
    }

    // Charger les prix des 30 derniers jours pour calcul médiane
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: historicalPrices } = await supabase
      .from('price_snapshots')
      .select('product_id, competitor_id, pack_size, price')
      .gte('scraped_at', thirtyDaysAgo.toISOString())
      .eq('is_suspect', false);

    // Créer un index pour la médiane par produit/concurrent/pack_size
    const priceHistory: Record<string, number[]> = {};
    historicalPrices?.forEach(p => {
      const key = `${p.product_id}_${p.competitor_id}_${p.pack_size}`;
      if (!priceHistory[key]) priceHistory[key] = [];
      priceHistory[key].push(Number(p.price));
    });

    // Scraper chaque domaine avec rate limiting
    const snapshots: PriceSnapshot[] = [];
    const errors: Array<{ mapping_id: string; error: string }> = [];

    for (const [domain, domainMappings] of Object.entries(byDomain)) {
      console.log(`Scraping ${domainMappings.length} URLs sur ${domain}`);
      
      for (const mapping of domainMappings) {
        const rateLimit = mapping.competitor?.rate_limit_ms || DEFAULT_RATE_LIMIT_MS;
        
        try {
          // Fetch HTML avec timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const response = await fetch(mapping.product_url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const html = await response.text();

          // Obtenir les sélecteurs pour ce domaine
          const selectors = mapping.competitor?.price_selector
            ? [mapping.competitor.price_selector]
            : PRICE_SELECTORS[domain] || PRICE_SELECTORS['default'];

          // Extraire le prix
          const price = extractPriceFromHtml(html, selectors);

          if (price === null) {
            throw new Error('Prix non trouvé dans la page');
          }

          // Vérifier si le prix est suspect
          const historyKey = `${mapping.product_id}_${mapping.competitor_id}_${mapping.pack_size}`;
          const median = calculateMedian(priceHistory[historyKey] || []);
          const isSuspect = isPriceSuspect(price, median);

          if (isSuspect) {
            console.log(`Prix suspect détecté: ${price}€ (médiane: ${median}€) pour ${mapping.product_url}`);
          }

          snapshots.push({
            product_id: mapping.product_id,
            competitor_id: mapping.competitor_id,
            pack_size: mapping.pack_size,
            price,
            currency: 'EUR',
            source_url: mapping.product_url,
            is_suspect: isSuspect,
          });

          // Mettre à jour last_success_at
          await supabase
            .from('competitor_product_map')
            .update({ 
              last_success_at: new Date().toISOString(),
              last_error: null 
            })
            .eq('id', mapping.id);

          offersSaved++;
          console.log(`✓ ${mapping.competitor?.name}: ${price}€ ${isSuspect ? '(suspect)' : ''}`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          console.error(`✗ ${mapping.product_url}: ${errorMessage}`);
          
          errors.push({
            mapping_id: mapping.id,
            error: errorMessage,
          });

          // Mettre à jour last_error
          await supabase
            .from('competitor_product_map')
            .update({ last_error: errorMessage })
            .eq('id', mapping.id);

          errorsCount++;
        }

        // Rate limit entre les requêtes
        await delay(rateLimit);
      }
    }

    // Insérer les snapshots
    if (snapshots.length > 0) {
      const { error: snapshotsError } = await supabase
        .from('price_snapshots')
        .insert(snapshots);

      if (snapshotsError) {
        console.error('Erreur insertion snapshots:', snapshotsError);
      }
    }

    // Calculer et mettre à jour price_current (meilleur prix des 72h)
    const seventyTwoHoursAgo = new Date();
    seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

    const { data: recentPrices } = await supabase
      .from('price_snapshots')
      .select('product_id, competitor_id, pack_size, price')
      .gte('scraped_at', seventyTwoHoursAgo.toISOString())
      .eq('is_suspect', false);

    // Grouper par product_id + pack_size et trouver le meilleur prix
    const bestPrices: Record<string, { price: number; competitor_id: string; count: number }> = {};
    
    recentPrices?.forEach(p => {
      const key = `${p.product_id}_${p.pack_size}`;
      const price = Number(p.price);
      
      if (!bestPrices[key] || price < bestPrices[key].price) {
        bestPrices[key] = {
          price,
          competitor_id: p.competitor_id,
          count: 1,
        };
      } else if (bestPrices[key]) {
        bestPrices[key].count++;
      }
    });

    // Upsert price_current
    for (const [key, data] of Object.entries(bestPrices)) {
      const [product_id, pack_size] = key.split('_');
      
      await supabase
        .from('price_current')
        .upsert({
          product_id,
          pack_size: parseInt(pack_size),
          best_price: data.price,
          best_competitor_id: data.competitor_id,
          updated_at: new Date().toISOString(),
          sample_count: data.count,
        }, {
          onConflict: 'product_id,pack_size'
        });
    }

    // Finaliser le run
    const endTime = Date.now();
    const status = errorsCount === 0 ? 'success' : (offersSaved > 0 ? 'partial' : 'fail');

    await supabase
      .from('scrape_runs')
      .update({
        finished_at: new Date().toISOString(),
        status,
        offers_saved: offersSaved,
        errors_count: errorsCount,
        details: { duration_ms: endTime - startTime, errors: errors.slice(0, 10) },
      })
      .eq('id', runId);

    console.log(`Scraping terminé: ${offersSaved} prix sauvegardés, ${errorsCount} erreurs`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        offers_saved: offersSaved,
        errors_count: errorsCount,
        duration_ms: endTime - startTime,
        status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur scraping:', error);

    // Marquer le run comme échoué si possible
    if (runId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('scrape_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'fail',
          offers_saved: offersSaved,
          errors_count: errorsCount + 1,
          details: { error: error instanceof Error ? error.message : 'Erreur inconnue' },
        })
        .eq('id', runId);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
