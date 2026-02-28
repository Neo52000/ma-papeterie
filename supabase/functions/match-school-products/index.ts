import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface Candidate {
  product_id: string;
  name: string;
  price: number;
  price_ttc: number;
  eco: boolean;
  brand: string | null;
  image_url: string | null;
  score: number;
  reason: string;
  tier: 'essentiel' | 'equilibre' | 'premium';
}

serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Non authentifié");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { uploadId } = await req.json();
    if (!uploadId) throw new Error("uploadId requis");

    // Verify ownership
    const { data: upload } = await supabase
      .from('school_list_uploads')
      .select('id')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();
    if (!upload) throw new Error("Upload introuvable");

    // Get pending matches
    const { data: matches } = await supabase
      .from('school_list_matches')
      .select('*')
      .eq('upload_id', uploadId);

    if (!matches?.length) throw new Error("Aucun item à matcher");

    // Build search keywords from all items
    const allKeywords = matches.map(m => m.item_label);
    
    // Fetch candidate products - broad search
    const searchTerms = allKeywords.flatMap(k => 
      k.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2)
    );
    const uniqueTerms = [...new Set(searchTerms)].slice(0, 20);
    
    // Get all active products for matching
    const { data: products } = await supabase
      .from('products')
      .select('id, name, name_short, description, price, price_ht, price_ttc, eco, brand, image_url, stock_quantity, category, ean, tva_rate')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .limit(2000);

    if (!products?.length) {
      // Update all as unmatched
      await supabase
        .from('school_list_matches')
        .update({ match_status: 'unmatched' })
        .eq('upload_id', uploadId);
      
      return new Response(
        JSON.stringify({ success: true, matched: 0, unmatched: matches.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let matchedCount = 0;
    const cartItems: Record<string, any[]> = { essentiel: [], equilibre: [], premium: [] };

    for (const match of matches) {
      const candidates = findCandidates(match.item_label, match.constraints, products);
      
      if (candidates.length === 0) {
        await supabase
          .from('school_list_matches')
          .update({ match_status: 'unmatched', candidates: [] })
          .eq('id', match.id);
        continue;
      }

      // Sort by score desc, assign tiers
      candidates.sort((a, b) => b.score - a.score);

      // Assign tiers based on price/eco
      const sorted = [...candidates];
      const byPrice = [...sorted].sort((a, b) => a.price - b.price);
      const ecoProducts = sorted.filter(c => c.eco);
      
      // Essentiel = cheapest
      const essentiel = byPrice[0];
      essentiel.tier = 'essentiel';
      
      // Premium = eco or highest quality (highest price with eco preference)
      const premium = ecoProducts.length > 0 
        ? ecoProducts.sort((a, b) => b.score - a.score)[0]
        : byPrice[byPrice.length - 1];
      premium.tier = 'premium';
      
      // Equilibre = best score that's not essentiel or premium
      const equilibre = sorted.find(c => c.product_id !== essentiel.product_id && c.product_id !== premium.product_id)
        || sorted[Math.min(1, sorted.length - 1)];
      equilibre.tier = 'equilibre';

      const topCandidates = candidates.slice(0, 5).map(c => ({
        product_id: c.product_id,
        name: c.name,
        price: c.price,
        price_ttc: c.price_ttc,
        eco: c.eco,
        brand: c.brand,
        image_url: c.image_url,
        score: c.score,
        reason: c.reason,
        tier: c.tier,
      }));

      const bestMatch = sorted[0];
      const matchStatus = bestMatch.score >= 0.6 ? 'matched' : 'partial';

      await supabase
        .from('school_list_matches')
        .update({
          match_status: matchStatus,
          confidence: bestMatch.score,
          candidates: topCandidates,
          selected_product_id: bestMatch.product_id,
        })
        .eq('id', match.id);

      matchedCount++;

      // Build cart items per tier
      for (const tier of ['essentiel', 'equilibre', 'premium'] as const) {
        const tierProduct = topCandidates.find(c => c.tier === tier) || topCandidates[0];
        cartItems[tier].push({
          match_id: match.id,
          product_id: tierProduct.product_id,
          product_name: tierProduct.name,
          price: tierProduct.price,
          price_ttc: tierProduct.price_ttc,
          quantity: match.item_quantity,
          eco: tierProduct.eco,
          image_url: tierProduct.image_url,
        });
      }
    }

    // Save 3 carts
    for (const tier of ['essentiel', 'equilibre', 'premium'] as const) {
      const items = cartItems[tier];
      const totalHt = items.reduce((s, i) => s + (i.price * i.quantity), 0);
      const totalTtc = items.reduce((s, i) => s + ((i.price_ttc || i.price) * i.quantity), 0);

      await supabase
        .from('school_list_carts')
        .upsert({
          upload_id: uploadId,
          tier,
          total_ht: Math.round(totalHt * 100) / 100,
          total_ttc: Math.round(totalTtc * 100) / 100,
          items_count: items.length,
          items,
        }, { onConflict: 'upload_id,tier' });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matched: matchedCount, 
        unmatched: matches.length - matchedCount,
        carts: Object.fromEntries(
          Object.entries(cartItems).map(([k, v]) => [k, {
            count: v.length,
            total: v.reduce((s, i) => s + i.price * i.quantity, 0)
          }])
        )
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Match error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function findCandidates(itemLabel: string, constraints: string | null, products: any[]): Candidate[] {
  const label = normalize(itemLabel);
  const constraintStr = constraints ? normalize(constraints) : '';
  const keywords = label.split(/\s+/).filter(w => w.length > 2);

  const candidates: Candidate[] = [];

  for (const p of products) {
    const pName = normalize(p.name);
    const pDesc = normalize(p.description || '');
    const pBrand = normalize(p.brand || '');
    const combined = `${pName} ${pDesc} ${pBrand}`;

    let score = 0;
    let reasons: string[] = [];

    // Exact substring match
    if (combined.includes(label)) {
      score += 0.5;
      reasons.push('correspondance exacte');
    }

    // Keyword matching
    let keywordMatches = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) {
        keywordMatches++;
      }
    }
    if (keywords.length > 0) {
      const kwScore = (keywordMatches / keywords.length) * 0.4;
      score += kwScore;
      if (keywordMatches > 0) reasons.push(`${keywordMatches}/${keywords.length} mots-clés`);
    }

    // Constraint match bonus
    if (constraintStr) {
      const constraintKws = constraintStr.split(/\s+/).filter(w => w.length > 2);
      let constraintMatches = 0;
      for (const ckw of constraintKws) {
        if (combined.includes(ckw)) constraintMatches++;
      }
      if (constraintKws.length > 0 && constraintMatches > 0) {
        score += (constraintMatches / constraintKws.length) * 0.1;
        reasons.push('contrainte respectée');
      }
    }

    if (score >= 0.15) {
      candidates.push({
        product_id: p.id,
        name: p.name,
        price: p.price_ht || p.price,
        price_ttc: p.price_ttc || p.price,
        eco: p.eco || false,
        brand: p.brand,
        image_url: p.image_url,
        score: Math.round(score * 100) / 100,
        reason: reasons.join(', '),
        tier: 'equilibre', // default, will be assigned later
      });
    }
  }

  return candidates;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
