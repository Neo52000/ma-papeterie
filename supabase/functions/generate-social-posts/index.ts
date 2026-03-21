import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface GenerateSocialPostsRequest {
  article_id: string;
  force?: boolean;
}

interface Classification {
  universe: string;
  seasonality: string | null;
  need_type: string;
  usage: string;
  main_angle: string;
}

interface EntityMatch {
  entity_type: string;
  entity_id: string;
  entity_label: string;
  match_score: number;
  match_reason: string;
}

interface SocialPostGenerated {
  platform: string;
  content: string;
  hashtags: string[];
  cta_text: string;
}

interface AIGenerationResult {
  classification: Classification;
  entity_matches: EntityMatch[];
  posts: SocialPostGenerated[];
  entity_highlight_post: SocialPostGenerated | null;
}

// ── Config ──────────────────────────────────────────────────────────────────

const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
const baseUrl = Deno.env.get("SOCIAL_BASE_URL") || "https://ma-papeterie.fr";

// ── Prompt IA ───────────────────────────────────────────────────────────────

const SOCIAL_GENERATION_PROMPT_V1 = `Tu es un expert en social media marketing pour Ma Papeterie, une papeterie physique et en ligne à Sainte-Maxime (France).

Tu dois analyser un article de blog et produire un JSON structuré contenant :
1. La classification thématique de l'article
2. Les entités métier pertinentes à promouvoir
3. 4 publications sociales adaptées (Facebook, Instagram, X, LinkedIn)

## Règles de génération
- Ton humain, chaleureux, crédible. Pas de jargon vide ni de texte générique.
- Chaque post DOIT être unique et adapté au réseau (format, ton, longueur).
- Facebook : 2-3 phrases + CTA + lien. Ton conversationnel.
- Instagram : caption engageante + 10-15 hashtags pertinents. Pas de lien dans le texte.
- X (Twitter) : max 280 caractères, percutant, 2-3 hashtags max.
- LinkedIn : ton professionnel, 3-4 phrases, expertise, CTA.
- CTA dynamiques : "Découvrez l'article complet", "Voir les produits", "Découvrez nos services", etc.
- Ne JAMAIS écrire le même texte sur deux réseaux.

## Entités métier possibles
- product : produit spécifique (ex: stylo Bic Cristal, agenda Oxford, cahier Clairefontaine)
- category : catégorie de produits (ex: fournitures scolaires, classement, stylos)
- brand : marque distribuée (ex: Oxford, Bic, Clairefontaine)
- service : service proposé (ex: impression, photocopies, tampons, reliure)
- promotion : offre en cours
- collection : collection thématique
- store_page : page magasin physique
- landing_page : page d'atterrissage

## Classification possible
- universe : scolaire | bureau | créatif | impression | photo | copies | cadeaux | général
- seasonality : rentrée | noël | pâques | fête-des-mères | été | null
- need_type : équipement | organisation | créativité | impression | service | cadeau
- usage : professionnel | scolaire | personnel | mixte
- main_angle : conseil | produit | service | promotion | expertise | trafic | magasin

## Format de réponse JSON strict
\`\`\`json
{
  "classification": {
    "universe": "...",
    "seasonality": "..." ou null,
    "need_type": "...",
    "usage": "...",
    "main_angle": "..."
  },
  "entity_matches": [
    {
      "entity_type": "category",
      "entity_id": "slug-de-la-categorie",
      "entity_label": "Nom lisible",
      "match_score": 0.85,
      "match_reason": "Raison du match en français"
    }
  ],
  "posts": [
    {
      "platform": "facebook",
      "content": "Texte du post Facebook...",
      "hashtags": [],
      "cta_text": "Découvrez l'article complet"
    },
    {
      "platform": "instagram",
      "content": "Caption Instagram...",
      "hashtags": ["papeterie", "rentrée", "..."],
      "cta_text": "Lien en bio"
    },
    {
      "platform": "x",
      "content": "Tweet court et percutant...",
      "hashtags": ["papeterie", "..."],
      "cta_text": "Lire l'article"
    },
    {
      "platform": "linkedin",
      "content": "Post LinkedIn professionnel...",
      "hashtags": [],
      "cta_text": "Découvrez notre expertise"
    }
  ],
  "entity_highlight_post": {
    "platform": "facebook",
    "content": "Post mettant en avant l'entité métier principale (produit, catégorie, marque, service...)...",
    "hashtags": [],
    "cta_text": "Découvrez la sélection"
  }
}
\`\`\`

## Règle pour entity_highlight_post
Si tu identifies une entité métier forte (score > 0.7), génère un 5e post optionnel ("entity_highlight_post") qui met spécifiquement en avant cette entité (produit, catégorie, marque ou service) plutôt que l'article.
Si aucune entité n'est suffisamment pertinente, mets "entity_highlight_post": null.

Réponds UNIQUEMENT avec le JSON, pas de texte avant/après.`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUtmUrl(
  slug: string,
  platform: string,
  utmSource: string,
  utmMedium: string,
  utmCampaignPrefix: string
): string {
  const params = new URLSearchParams({
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: `${utmCampaignPrefix}${slug}`,
    utm_content: platform,
  });
  return `${baseUrl}/blog/${slug}?${params.toString()}`;
}

// ── Fallback Content ─────────────────────────────────────────────────────────

function generateFallbackContent(
  article: { title: string; slug: string; excerpt: string | null },
  utmSource: string,
  utmMedium: string,
  utmCampaignPrefix: string
): AIGenerationResult {
  const url = buildUtmUrl(article.slug, "social", utmSource, utmMedium, utmCampaignPrefix);
  const title = article.title;
  const excerpt = article.excerpt || title;

  return {
    classification: {
      universe: "général",
      seasonality: null,
      need_type: "information",
      usage: "mixte",
      main_angle: "trafic",
    },
    entity_matches: [],
    posts: [
      {
        platform: "facebook",
        content: `${excerpt}\n\nDécouvrez notre dernier article sur le blog Ma Papeterie !`,
        hashtags: [],
        cta_text: "Découvrez l'article complet",
      },
      {
        platform: "instagram",
        content: `${excerpt}\n\nRetrouvez tous nos conseils sur le blog Ma Papeterie.`,
        hashtags: ["papeterie", "mapapeterie", "saintemaxime", "blog"],
        cta_text: "Lien en bio",
      },
      {
        platform: "x",
        content: `${title.slice(0, 200)} — À lire sur notre blog !`,
        hashtags: ["papeterie"],
        cta_text: "Lire l'article",
      },
      {
        platform: "linkedin",
        content: `${excerpt}\n\nMa Papeterie partage son expertise. Découvrez notre dernier article.`,
        hashtags: [],
        cta_text: "Découvrez l'article",
      },
    ],
    entity_highlight_post: null,
  };
}

// ── AI Call ──────────────────────────────────────────────────────────────────

async function generateWithClaude(
  article: { title: string; content: string; excerpt: string | null; category: string | null; slug: string },
  keywords: string[],
  aiModel: string
): Promise<AIGenerationResult> {
  const plainText = stripHtml(article.content || "").slice(0, 3000);

  const userPrompt = `Analyse cet article de blog de Ma Papeterie et génère les publications sociales.

**Titre:** ${article.title}
**Catégorie:** ${article.category || "général"}
**Extrait:** ${article.excerpt || ""}
**Mots-clés SEO:** ${keywords.join(", ") || "aucun"}
**Contenu (extrait):** ${plainText}

Génère le JSON demandé.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel,
      max_tokens: 3000,
      messages: [
        { role: "user", content: SOCIAL_GENERATION_PROMPT_V1 + "\n\n" + userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in AI response");
  }

  return JSON.parse(jsonMatch[0]) as AIGenerationResult;
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(createHandler({
  name: "generate-social-posts",
  auth: "admin",
  rateLimit: { prefix: "generate-social-posts", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const startTime = Date.now();

  const { article_id, force } = body as GenerateSocialPostsRequest;

  if (!article_id) {
    return jsonResponse(
      { error: "Missing required field: article_id" },
      400,
      corsHeaders,
    );
  }

  // 1. Fetch article + metadata
  const { data: article, error: articleError } = await supabaseAdmin
    .from("blog_articles")
    .select("*, blog_seo_metadata(*)")
    .eq("id", article_id)
    .single();

  if (articleError || !article) {
    return jsonResponse({ error: "Article not found" }, 404, corsHeaders);
  }

  // 2. Check for existing campaign (anti-doublon)
  const { data: existingCampaign } = await supabaseAdmin
    .from("social_campaigns")
    .select("id, status")
    .eq("article_id", article_id)
    .single();

  // If campaign already has generated posts, return them instead of regenerating (unless force=true)
  if (existingCampaign && existingCampaign.status === "generated" && !force) {
    const { data: existingPosts } = await supabaseAdmin
      .from("social_posts")
      .select("*")
      .eq("campaign_id", existingCampaign.id)
      .order("platform");

    return {
      success: true,
      campaign_id: existingCampaign.id,
      posts: existingPosts,
      already_generated: true,
    };
  }

  // 3. Load settings
  const { data: settings } = await supabaseAdmin
    .from("social_settings")
    .select("*")
    .limit(1)
    .single();

  const aiModel = settings?.ai_model || "claude-sonnet-4-20250514";
  const utmSource = settings?.utm_source || "social";
  const utmMedium = settings?.utm_medium || "post";
  const utmCampaignPrefix = settings?.utm_campaign_prefix || "blog_";
  const activePlatforms: string[] = settings?.active_platforms || ["facebook", "instagram", "x", "linkedin"];

  // 4. Create or update campaign
  let campaignId: string;
  if (existingCampaign) {
    campaignId = existingCampaign.id;
    await supabaseAdmin
      .from("social_campaigns")
      .update({ status: "detected", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
  } else {
    const { data: newCampaign, error: campaignError } = await supabaseAdmin
      .from("social_campaigns")
      .insert({
        article_id,
        status: "detected",
        utm_params: { source: utmSource, medium: utmMedium, campaign: `${utmCampaignPrefix}${article.slug}` },
      })
      .select()
      .single();

    if (campaignError) throw new Error(`Failed to create campaign: ${campaignError.message}`);
    campaignId = newCampaign.id;
  }

  // 5. Generate with AI (with fallback)
  const keywords = article.blog_seo_metadata?.[0]?.keywords || [];
  let result: AIGenerationResult;
  let usedFallback = false;
  let fallbackError: string | null = null;
  try {
    result = await generateWithClaude(article, keywords, aiModel);
  } catch (aiError) {
    console.error("AI generation failed, using fallback:", aiError);
    result = generateFallbackContent(article, utmSource, utmMedium, utmCampaignPrefix);
    usedFallback = true;
    fallbackError = aiError instanceof Error ? aiError.message : "AI generation failed";
  }

  // 6. Update campaign with classification, matches, and entity highlight
  const classificationWithHighlight = {
    ...result.classification,
    ...(result.entity_highlight_post ? { entity_highlight: result.entity_highlight_post } : {}),
  };

  await supabaseAdmin
    .from("social_campaigns")
    .update({
      status: "generated",
      classification: classificationWithHighlight,
      entity_matches: result.entity_matches,
      selected_entity: result.entity_matches?.[0] || null,
    })
    .eq("id", campaignId);

  // 7. Delete existing posts if regenerating, then insert new ones
  await supabaseAdmin.from("social_posts").delete().eq("campaign_id", campaignId);

  const postsToInsert = result.posts
    .filter((p) => activePlatforms.includes(p.platform))
    .map((p) => ({
      campaign_id: campaignId,
      platform: p.platform,
      content: p.content,
      hashtags: p.hashtags || [],
      cta_text: p.cta_text,
      cta_url: buildUtmUrl(article.slug, p.platform, utmSource, utmMedium, utmCampaignPrefix),
      media_url: article.image_url || null,
      status: "draft",
    }));

  const { data: insertedPosts, error: postsError } = await supabaseAdmin
    .from("social_posts")
    .insert(postsToInsert)
    .select();

  if (postsError) throw new Error(`Failed to insert posts: ${postsError.message}`);

  // 8. Log generation
  for (const post of insertedPosts || []) {
    await supabaseAdmin.from("social_publication_logs").insert({
      post_id: post.id,
      action: usedFallback ? "generate_fallback" : "generate",
      status: usedFallback ? "warning" : "success",
      duration_ms: Date.now() - startTime,
      error_message: fallbackError,
      response_data: { ai_model: aiModel, prompt_version: "v1", fallback: usedFallback },
    });
  }

  return {
    success: true,
    campaign_id: campaignId,
    classification: result.classification,
    entity_matches: result.entity_matches,
    posts: insertedPosts,
  };
}));
