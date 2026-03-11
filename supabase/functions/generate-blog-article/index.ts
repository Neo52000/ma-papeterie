import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";

interface GenerateArticleRequest {
  keyword: string;
  topic: string;
  targetAudience?: string;
  wordCount?: number;
}

interface ArticleContent {
  title: string;
  html: string;
  imageUrl?: string;
  keywords: string[];
  readingTime: number;
  wordCount: number;
}

async function generateArticleWithClaude(
  request: GenerateArticleRequest
): Promise<ArticleContent> {
  const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  const prompt = `Tu es un rédacteur SEO expert. Génère un article de blog en HTML optimisé pour les moteurs de recherche.

**Paramètres:**
- Mot-clé cible: ${request.keyword}
- Titre du sujet: ${request.topic}
- Audience cible: ${request.targetAudience || "Général"}
- Longueur cible: ${request.wordCount || 1500} mots

**Exigences:**
1. Article en HTML valide avec balises sémantiques (<h1>, <h2>, <p>, <ul>, etc.)
2. Optimisé SEO:
   - Titre accrocheur (H1)
   - Mots-clés naturellement intégrés
   - Paragraphes courts (max 3-4 lignes)
   - Listes à puces pour la lisibilité
3. Inclure une conclusion avec CTA (call-to-action)
4. Longueur: ~${request.wordCount || 1500} mots

**Format de réponse JSON strict:**
\`\`\`json
{
  "title": "Titre de l'article",
  "html": "<article>...HTML de l'article...</article>",
  "keywords": ["mot-clé1", "mot-clé2", "mot-clé3", "mot-clé4", "mot-clé5"],
  "readingTime": 8,
  "wordCount": 1500
}
\`\`\`

**Important:** Réponds UNIQUEMENT avec le JSON, pas de texte avant/après.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error("Erreur API Claude");
  }

  const data = await response.json();
  const content = data.content[0].text;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Réponse Claude invalide");
  }
  const parsed = JSON.parse(jsonMatch[0]);

  const imageUrl = `https://picsum.photos/800/400?random=${Date.now()}`;

  return {
    title: parsed.title,
    html: parsed.html,
    imageUrl: imageUrl,
    keywords: parsed.keywords || [],
    readingTime: parsed.readingTime || 5,
    wordCount: parsed.wordCount || 1500,
  };
}

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "generate-blog-article");
  if (!(await checkRateLimit(rlKey, 5, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    // ── Auth (admin uniquement) ─────────────────────────────────────────────
    const authResult = await requireAdmin(req, corsHeaders);
    if (isAuthError(authResult)) return authResult.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { keyword, topic, targetAudience, wordCount } = (await req.json()) as GenerateArticleRequest;

    if (!keyword || !topic) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants : keyword, topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate article with Claude
    const articleContent = await generateArticleWithClaude({
      keyword,
      topic,
      targetAudience,
      wordCount,
    });

    // Save to Supabase
    const slug = topic
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

    const { data: article, error: insertError } = await supabase
      .from("blog_articles")
      .insert({
        title: articleContent.title,
        slug: slug,
        content: articleContent.html,
        image_url: articleContent.imageUrl,
        category: "seo",
        seo_machine_status: "completed",
        excerpt: `Article optimisé pour le mot-clé: ${keyword}`,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Save SEO metadata
    const { error: metaError } = await supabase
      .from("blog_seo_metadata")
      .insert({
        article_id: article.id,
        keywords: articleContent.keywords,
        word_count: articleContent.wordCount,
        reading_time: articleContent.readingTime,
        target_audience: targetAudience,
      });

    if (metaError) {
      console.warn("Failed to save metadata:", metaError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: article.id,
          title: articleContent.title,
          slug: article.slug,
          wordCount: articleContent.wordCount,
          readingTime: articleContent.readingTime,
          keywords: articleContent.keywords,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, { context: "generate-blog-article" });
  }
});
