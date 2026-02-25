import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";

function env(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? fallback;
}

const SYSTEM_PROMPT = `Tu es un expert en papeterie et fournitures de bureau.
À partir d'un code EAN, identifie le produit en t'appuyant sur tes connaissances et les informations disponibles en ligne.
Retourne UNIQUEMENT un objet JSON valide (sans markdown, sans backticks), avec exactement ces champs :
{
  "marque": "string",
  "reference_fabricant": "string",
  "designation_courte": "string",
  "caracteristiques": "string — format, coloris, conditionnement, etc.",
  "prix_ttc_constate": number ou null,
  "titre_ecommerce": "string — titre optimisé SEO pour fiche e-commerce",
  "points_forts": ["string", "string", "string"],
  "description": "string — 2-3 phrases de description commerciale en français"
}
Si le produit est inconnu ou l'EAN invalide, retourne : {"erreur": "Produit non trouvé pour cet EAN"}`;

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  // Auth check
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  let ean: string;
  try {
    const body = await req.json();
    ean = (body.ean ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ erreur: "Body JSON invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ean) {
    return new Response(JSON.stringify({ erreur: "EAN manquant" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const openaiKey = env("OPENAI_API_KEY");
  if (!openaiKey) {
    return new Response(JSON.stringify({ erreur: "Clé API OpenAI non configurée" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userMessage = `Code EAN : ${ean}\nIdentifie ce produit et retourne les informations demandées en JSON.`;

  // Try web-search model first, fallback to standard
  const result = await callWithFallback(openaiKey, userMessage);

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function callWithFallback(apiKey: string, userMessage: string): Promise<Record<string, any>> {
  // 1st attempt: model with web search capability
  try {
    const data = await callOpenAI(apiKey, "gpt-4o-mini-search-preview", userMessage, true);
    return parseResult(data);
  } catch (err: any) {
    console.log(`[lookup-ean] search model failed (${err.message}), falling back to gpt-4o-mini`);
  }

  // Fallback: standard model (no web search)
  try {
    const data = await callOpenAI(apiKey, "gpt-4o-mini", userMessage, false);
    return parseResult(data);
  } catch (err: any) {
    console.error("[lookup-ean] fallback also failed:", err.message);
    return { erreur: `Erreur API OpenAI : ${err.message}` };
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  userMessage: string,
  useWebSearch: boolean,
): Promise<any> {
  const body: Record<string, any> = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  };

  if (useWebSearch) {
    body.web_search_options = {};
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} — ${text.slice(0, 200)}`);
  }

  return response.json();
}

function parseResult(data: any): Record<string, any> {
  const content: string =
    data?.choices?.[0]?.message?.content ?? "";

  if (!content) {
    return { erreur: "Réponse vide de l'IA" };
  }

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract first JSON object from the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // ignore
      }
    }
    console.error("[lookup-ean] JSON parse failed, raw content:", cleaned.slice(0, 300));
    return { erreur: "Réponse IA non analysable" };
  }
}
