import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface GenerateCaptionsRequest {
  campaign_id: string;
}

interface SocialPostGenerated {
  platform: string;
  content: string;
  hashtags: string[];
  cta_text: string;
  post_variant?: string;
}

interface AIGenerationResult {
  posts: SocialPostGenerated[];
}

// ── Config ──────────────────────────────────────────────────────────────────

const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
const baseUrl = Deno.env.get("SOCIAL_BASE_URL") || "https://ma-papeterie.fr";

// ── Prompt IA ───────────────────────────────────────────────────────────────

const STANDALONE_PROMPT = `Tu es un expert en social media marketing pour Ma Papeterie, une papeterie physique et en ligne à Sainte-Maxime (France).

Tu dois générer des publications sociales à partir d'un contexte fourni par l'administrateur (produit, promotion, occasion, etc.).

## Règles de génération
- Ton humain, chaleureux, crédible. Pas de jargon vide ni de texte générique.
- Chaque post DOIT être unique et adapté au réseau (format, ton, longueur).
- Facebook : 2-3 phrases + CTA. Ton conversationnel, engageant.
- Instagram : caption engageante + 10-15 hashtags pertinents. Pas de lien dans le texte.
- X (Twitter) : max 280 caractères, percutant, 2-3 hashtags max.
- LinkedIn : ton professionnel, 3-4 phrases, expertise, CTA.
- WhatsApp : message court (max 160 caractères), direct, template-friendly. Pas de hashtags.
- Ne JAMAIS écrire le même texte sur deux réseaux.
- Si des visuels sont mentionnés, adapter le texte pour les accompagner (ex: "Découvrez en image...", "Regardez cette sélection...").

## Format de réponse JSON strict
\`\`\`json
{
  "posts": [
    {
      "platform": "facebook",
      "content": "Texte du post Facebook...",
      "hashtags": [],
      "cta_text": "Découvrez nos produits",
      "post_variant": "feed"
    },
    {
      "platform": "instagram",
      "content": "Caption Instagram...",
      "hashtags": ["papeterie", "rentrée", "..."],
      "cta_text": "Lien en bio",
      "post_variant": "feed"
    },
    {
      "platform": "x",
      "content": "Tweet court et percutant...",
      "hashtags": ["papeterie"],
      "cta_text": "Voir la sélection",
      "post_variant": "feed"
    },
    {
      "platform": "linkedin",
      "content": "Post LinkedIn professionnel...",
      "hashtags": [],
      "cta_text": "Découvrez notre expertise",
      "post_variant": "feed"
    },
    {
      "platform": "whatsapp",
      "content": "Message WhatsApp court et direct...",
      "hashtags": [],
      "cta_text": "Voir l'offre",
      "post_variant": "template"
    }
  ]
}
\`\`\`

Réponds UNIQUEMENT avec le JSON, pas de texte avant/après.`;

// ── Fallback Content ─────────────────────────────────────────────────────────

function generateFallbackContent(
  title: string,
  description: string,
  activePlatforms: string[]
): AIGenerationResult {
  const allPosts: SocialPostGenerated[] = [
    {
      platform: "facebook",
      content: `${description}\n\nDécouvrez cette sélection chez Ma Papeterie !`,
      hashtags: [],
      cta_text: "Découvrez nos produits",
      post_variant: "feed",
    },
    {
      platform: "instagram",
      content: `${description}\n\nRetrouvez cette sélection chez Ma Papeterie.`,
      hashtags: ["papeterie", "mapapeterie", "saintemaxime"],
      cta_text: "Lien en bio",
      post_variant: "feed",
    },
    {
      platform: "x",
      content: `${title.slice(0, 200)} — Chez Ma Papeterie !`,
      hashtags: ["papeterie"],
      cta_text: "Voir la sélection",
      post_variant: "feed",
    },
    {
      platform: "linkedin",
      content: `${description}\n\nMa Papeterie, votre partenaire papeterie à Sainte-Maxime.`,
      hashtags: [],
      cta_text: "Découvrez notre sélection",
      post_variant: "feed",
    },
    {
      platform: "whatsapp",
      content: `${title.slice(0, 120)} — Chez Ma Papeterie !`,
      hashtags: [],
      cta_text: "Voir l'offre",
      post_variant: "template",
    },
  ];

  return {
    posts: allPosts.filter((p) => activePlatforms.includes(p.platform)),
  };
}

// ── AI Call ──────────────────────────────────────────────────────────────────

async function generateWithClaude(
  context: Record<string, unknown>,
  mediaUrls: string[] | null,
  activePlatforms: string[],
  aiModel: string
): Promise<AIGenerationResult> {
  const platformsList = activePlatforms.join(", ");

  const userPrompt = `Génère des publications sociales pour Ma Papeterie à partir de ce contexte.

**Titre :** ${context.title || "Publication Ma Papeterie"}
**Produit / Collection :** ${context.product || "non spécifié"}
**Promotion :** ${context.promo || "aucune"}
**Occasion :** ${context.occasion || "non spécifiée"}
**Ton souhaité :** ${context.tone || "chaleureux"}
**Description :** ${context.description || ""}
**Visuels :** ${mediaUrls?.length ? `${mediaUrls.length} visuel(s) fourni(s)` : "aucun visuel"}

**Plateformes actives :** ${platformsList}

Génère UNIQUEMENT les posts pour les plateformes listées ci-dessus.`;

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
        { role: "user", content: STANDALONE_PROMPT + "\n\n" + userPrompt },
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

  const result = JSON.parse(jsonMatch[0]) as AIGenerationResult;

  // Filter to only active platforms
  result.posts = result.posts.filter((p) => activePlatforms.includes(p.platform));

  return result;
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(createHandler({
  name: "generate-social-captions",
  auth: "admin",
  rateLimit: { prefix: "generate-social-captions", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const startTime = Date.now();

  const { campaign_id } = body as GenerateCaptionsRequest;

  if (!campaign_id) {
    return jsonResponse(
      { error: "Missing required field: campaign_id" },
      400,
      corsHeaders,
    );
  }

  // 1. Fetch campaign
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("social_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campaignError || !campaign) {
    return jsonResponse({ error: "Campaign not found" }, 404, corsHeaders);
  }

  if (campaign.source_type === "blog") {
    return jsonResponse(
      { error: "This endpoint is for standalone campaigns only. Use generate-social-posts for blog campaigns." },
      400,
      corsHeaders,
    );
  }

  // 2. Load settings
  const { data: settings } = await supabaseAdmin
    .from("social_settings")
    .select("*")
    .limit(1)
    .single();

  const aiModel = settings?.ai_model || "claude-sonnet-4-20250514";
  const utmSource = settings?.utm_source || "social";
  const utmMedium = settings?.utm_medium || "post";
  const activePlatforms: string[] = settings?.active_platforms || ["facebook", "instagram", "x", "linkedin", "whatsapp"];

  // 3. Generate with AI (with fallback)
  const rawContext = campaign.raw_context || {};
  const title = campaign.title || rawContext.title || "Publication Ma Papeterie";
  const description = rawContext.description || title;
  let result: AIGenerationResult;
  let usedFallback = false;
  let fallbackError: string | null = null;

  try {
    result = await generateWithClaude(
      { ...rawContext, title },
      campaign.media_urls,
      activePlatforms,
      aiModel,
    );
  } catch (aiError) {
    console.error("AI generation failed, using fallback:", aiError);
    result = generateFallbackContent(title, description, activePlatforms);
    usedFallback = true;
    fallbackError = aiError instanceof Error ? aiError.message : "AI generation failed";
  }

  // 4. Update campaign status
  await supabaseAdmin
    .from("social_campaigns")
    .update({ status: "generated" })
    .eq("id", campaign_id);

  // 5. Delete existing posts if regenerating, then insert new ones
  await supabaseAdmin.from("social_posts").delete().eq("campaign_id", campaign_id);

  // Build UTM URL for CTA links
  const slug = (campaign.title || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  const utmParams = new URLSearchParams({
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: `standalone_${slug}`,
  });
  const ctaUrl = `${baseUrl}?${utmParams.toString()}`;

  const postsToInsert = result.posts.map((p) => ({
    campaign_id,
    platform: p.platform,
    content: p.content,
    hashtags: p.hashtags || [],
    cta_text: p.cta_text,
    cta_url: ctaUrl,
    media_url: campaign.media_urls?.[0] || null,
    status: "draft",
    post_variant: p.post_variant || "feed",
  }));

  const { data: insertedPosts, error: postsError } = await supabaseAdmin
    .from("social_posts")
    .insert(postsToInsert)
    .select();

  if (postsError) throw new Error(`Failed to insert posts: ${postsError.message}`);

  // 6. Log generation
  for (const post of insertedPosts || []) {
    await supabaseAdmin.from("social_publication_logs").insert({
      post_id: post.id,
      action: usedFallback ? "generate_fallback" : "generate",
      status: usedFallback ? "warning" : "success",
      duration_ms: Date.now() - startTime,
      error_message: fallbackError,
      response_data: { ai_model: aiModel, prompt_version: "standalone_v1", fallback: usedFallback },
    });
  }

  return {
    success: true,
    campaign_id,
    posts: insertedPosts,
  };
}));
