import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callAI } from "../_shared/ai-client.ts";

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

    const { productName, productEan, competitorProducts } = await req.json();

    console.log(`Matching produit: ${productName} (EAN: ${productEan})`);

    // 1. Match exact par EAN si disponible
    if (productEan) {
      const exactMatch = competitorProducts.find(
        (p: any) => p.ean === productEan
      );
      if (exactMatch) {
        return new Response(
          JSON.stringify({ match: exactMatch, confidence: 1.0, method: 'EAN' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Match par similarité sémantique via Lovable AI
    const prompt = `Tu es un expert en matching de produits. 
    
Produit de référence: "${productName}"
EAN de référence: ${productEan || 'non disponible'}

Produits concurrents à comparer:
${competitorProducts.map((p: any, i: number) => `${i + 1}. ${p.name} (EAN: ${p.ean || 'N/A'})`).join('\n')}

Analyse la similarité entre le produit de référence et chaque produit concurrent.
Retourne l'index (1-based) du produit le plus similaire, ou 0 si aucun match pertinent.
Réponds uniquement avec un nombre entre 0 et ${competitorProducts.length}.`;

    const aiData = await callAI([
          { role: 'system', content: 'Tu es un assistant de matching produit. Réponds uniquement avec un nombre.' },
          { role: 'user', content: prompt }
        ]);
    const matchIndex = parseInt(aiData.choices[0].message.content.trim());

    if (matchIndex > 0 && matchIndex <= competitorProducts.length) {
      const match = competitorProducts[matchIndex - 1];
      return new Response(
        JSON.stringify({ 
          match, 
          confidence: 0.8, 
          method: 'AI_SEMANTIC',
          reasoning: 'Match basé sur similarité sémantique IA'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Aucun match trouvé
    return new Response(
      JSON.stringify({ 
        match: null, 
        confidence: 0, 
        method: 'NO_MATCH',
        reasoning: 'Aucun produit concurrent similaire trouvé'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur matching:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
