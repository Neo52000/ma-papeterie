import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateArticleWithClaude(
  request: GenerateArticleRequest
): Promise<ArticleContent> {
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
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Parse the JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    // Generate a dummy image URL (could integrate with DALL-E or Unsplash)
    const imageUrl = `https://picsum.photos/800/400?random=${Date.now()}`;

    return {
      title: parsed.title,
      html: parsed.html,
      imageUrl: imageUrl,
      keywords: parsed.keywords || [],
      readingTime: parsed.readingTime || 5,
      wordCount: parsed.wordCount || 1500,
    };
  } catch (e) {
    console.error("Failed to parse Claude response:", e, content);
    throw new Error("Failed to parse article content from Claude");
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyword, topic, targetAudience, wordCount } = (await req.json()) as GenerateArticleRequest;

    if (!keyword || !topic) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: keyword, topic",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        }
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

    if (insertError) {
      throw new Error(`Failed to save article: ${insertError.message}`);
    }

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
      {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  }
});
