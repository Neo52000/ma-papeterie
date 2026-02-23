import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ContentBlock {
  type: "heading" | "paragraph" | "list" | "faq" | "cta";
  level?: 2 | 3;
  content?: string;
  ordered?: boolean;
  items?: string[];
  questions?: { q: string; a: string }[];
  title?: string;
  description?: string;
  link?: string;
  button?: string;
}

interface GenerateRequest {
  slug: string;
  brief: string;
  keywords: string[];
  location?: string;
  schema_type?: string;
  tone?: "professional" | "friendly" | "informative";
}

interface GenerateResponse {
  meta_title: string;
  meta_description: string;
  h1: string;
  content: ContentBlock[];
  json_ld: Record<string, unknown>;
  seo_score: number;
}

// ── SEO score helper ─────────────────────────────────────────────────────────

function computeSeoScore(data: GenerateResponse, keywords: string[]): number {
  let score = 0;
  const firstWords = data.content
    .slice(0, 2)
    .map((b) => b.content ?? b.title ?? "")
    .join(" ")
    .toLowerCase();

  if (data.meta_title.length >= 45 && data.meta_title.length <= 65) score += 20;
  else if (data.meta_title.length > 0) score += 10;

  if (data.meta_description.length >= 120 && data.meta_description.length <= 165) score += 20;
  else if (data.meta_description.length > 0) score += 10;

  if (data.content.some((b) => b.type === "faq" && (b.questions?.length ?? 0) >= 2)) score += 20;

  if (data.json_ld && Object.keys(data.json_ld).length > 2) score += 20;

  if (data.h1 && data.h1 !== data.meta_title) score += 10;

  if (keywords.some((kw) => firstWords.includes(kw.toLowerCase()))) score += 10;

  return Math.min(score, 100);
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: corsHeaders });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Accès interdit" }), { status: 403, headers: corsHeaders });
    }

    const body: GenerateRequest = await req.json();
    const { slug, brief, keywords = [], location = "Chaumont, Haute-Marne", schema_type = "WebPage", tone = "professional" } = body;

    if (!brief) return new Response(JSON.stringify({ error: "Le champ 'brief' est requis" }), { status: 400, headers: corsHeaders });

    const toneMap = {
      professional: "professionnel et expert",
      friendly: "chaleureux et proche du client",
      informative: "informatif et pédagogique",
    };

    const systemPrompt = `Tu es un expert SEO spécialisé en référencement local et en optimisation pour les IA de recherche (Google AI Overview, Perplexity AI, SGE).
Tu génères du contenu web pour une papeterie locale : Papeterie Reine & Fils, ${location}.

Règles de génération :
1. Ton : ${toneMap[tone] ?? toneMap.professional}
2. Structure : H1 percutant → H2 sections → paragraphes courts (2-4 phrases max)
3. FAQ obligatoire : 3-5 questions fréquentes sur le sujet (FAQPage Schema)
4. Local SEO : intégrer naturellement "${location}", code postal 52000 si pertinent
5. E-E-A-T : mettre en avant l'expertise et la proximité locale
6. Mots-clés : intégrer naturellement ces mots-clés : ${keywords.join(", ")}
7. Longueur : meta_title ≤ 60 chars, meta_description 140-160 chars, contenu 400-700 mots

Format de réponse : JSON strict, aucun texte autour.

Types de blocs disponibles :
- {"type":"heading","level":2,"content":"Titre H2"}
- {"type":"heading","level":3,"content":"Titre H3"}
- {"type":"paragraph","content":"Texte de paragraphe"}
- {"type":"list","ordered":false,"items":["Item 1","Item 2","Item 3"]}
- {"type":"faq","questions":[{"q":"Question ?","a":"Réponse directe et concise."}]}
- {"type":"cta","title":"Titre CTA","description":"Sous-titre","link":"/contact","button":"Texte bouton"}

JSON attendu :
{
  "meta_title": "Titre SEO page | Papeterie Reine & Fils — Chaumont",
  "meta_description": "Description SEO complète entre 140 et 160 caractères...",
  "h1": "Heading H1 accrocheur différent du meta_title",
  "content": [...blocs...],
  "json_ld": {...schema.org approprié pour ${schema_type}...}
}`;

    const userPrompt = `Génère une page web optimisée SEO.

Slug / URL : /p/${slug}
Type de schéma : ${schema_type}
Résumé de la page : ${brief}
Mots-clés cibles : ${keywords.join(", ")}
Localisation : ${location}

Assure-toi que :
- Le contenu répond à une intention de recherche claire
- Les réponses FAQ sont directes et utilisables en featured snippet
- Le JSON-LD ${schema_type} est complet et valide
- Le CTA pointe vers /contact ou une page pertinente du site`;

    const aiResp = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { model: "gpt-4o-mini", temperature: 0.7 },
    );

    const rawContent = aiResp.choices?.[0]?.message?.content ?? "";
    let generated: GenerateResponse;

    try {
      // Extraire le JSON (parfois l'IA enveloppe dans des backticks)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Pas de JSON dans la réponse IA");
      generated = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Erreur parsing JSON IA:", parseErr, rawContent.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "La réponse IA n'est pas un JSON valide", raw: rawContent.slice(0, 200) }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Calculer le score SEO
    generated.seo_score = computeSeoScore(generated, keywords);

    return new Response(JSON.stringify(generated), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-page-content error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Erreur interne" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
