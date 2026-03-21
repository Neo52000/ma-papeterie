import { callAI } from "../_shared/ai-client.ts";
import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "match-products",
  auth: "admin",
  rateLimit: { prefix: "match-products", max: 15, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { productName, productEan, competitorProducts } = body as any;

  console.log(`Matching produit: ${productName} (EAN: ${productEan})`);

  // 1. Match exact par EAN si disponible
  if (productEan) {
    const exactMatch = competitorProducts.find(
      (p: any) => p.ean === productEan
    );
    if (exactMatch) {
      return { match: exactMatch, confidence: 1.0, method: 'EAN' };
    }
  }

  // 2. Match par similarité sémantique via AI
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
    return {
      match,
      confidence: 0.8,
      method: 'AI_SEMANTIC',
      reasoning: 'Match basé sur similarité sémantique IA'
    };
  }

  // 3. Aucun match trouvé
  return {
    match: null,
    confidence: 0,
    method: 'NO_MATCH',
    reasoning: 'Aucun produit concurrent similaire trouvé'
  };
}));
