import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface PublishRequest {
  post_id: string;
}

interface PublishResult {
  success: boolean;
  external_post_id: string | null;
  error?: string;
  mock?: boolean;
}

// ── Meta Graph API Config ───────────────────────────────────────────────────

const META_PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN");
const META_PAGE_ID = Deno.env.get("META_PAGE_ID");
const META_IG_USER_ID = Deno.env.get("META_IG_USER_ID");
const META_API_VERSION = "v19.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ── Publishers ──────────────────────────────────────────────────────────────

async function publishToFacebook(post: Record<string, unknown>): Promise<PublishResult> {
  // Real Meta Graph API if credentials are configured
  if (META_PAGE_ACCESS_TOKEN && META_PAGE_ID) {
    try {
      const content = post.content as string;
      const mediaUrl = post.media_url as string | null;
      const ctaUrl = post.cta_url as string | null;
      const message = ctaUrl ? `${content}\n\n${ctaUrl}` : content;

      let endpoint: string;
      let body: Record<string, string>;

      if (mediaUrl) {
        // Photo post
        endpoint = `${META_BASE_URL}/${META_PAGE_ID}/photos`;
        body = {
          url: mediaUrl,
          caption: message,
          access_token: META_PAGE_ACCESS_TOKEN,
        };
      } else {
        // Text post
        endpoint = `${META_BASE_URL}/${META_PAGE_ID}/feed`;
        body = {
          message,
          access_token: META_PAGE_ACCESS_TOKEN,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || `Facebook API error: ${response.status}`;
        return { success: false, external_post_id: null, error: errorMsg };
      }

      return {
        success: true,
        external_post_id: data.id || data.post_id,
      };
    } catch (err) {
      return {
        success: false,
        external_post_id: null,
        error: err instanceof Error ? err.message : "Facebook publish error",
      };
    }
  }

  // Mock fallback
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `fb_mock_${Date.now()}`, mock: true };
}

async function publishToInstagram(post: Record<string, unknown>): Promise<PublishResult> {
  // Real Meta Graph API if credentials are configured
  if (META_PAGE_ACCESS_TOKEN && META_IG_USER_ID) {
    try {
      const content = post.content as string;
      const mediaUrl = post.media_url as string | null;
      const hashtags = (post.hashtags as string[]) || [];

      if (!mediaUrl) {
        return {
          success: false,
          external_post_id: null,
          error: "Instagram requires a media URL (image or video) for publishing.",
        };
      }

      // Build caption with hashtags
      const hashtagStr = hashtags.length > 0 ? "\n\n" + hashtags.map((h) => `#${h}`).join(" ") : "";
      const caption = `${content}${hashtagStr}`;

      // Step 1: Create media container
      const containerResponse = await fetch(`${META_BASE_URL}/${META_IG_USER_ID}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption,
          access_token: META_PAGE_ACCESS_TOKEN,
        }),
      });

      const containerData = await containerResponse.json();

      if (!containerResponse.ok) {
        const errorMsg = containerData.error?.message || `Instagram container error: ${containerResponse.status}`;
        return { success: false, external_post_id: null, error: errorMsg };
      }

      const containerId = containerData.id;

      // Step 2: Wait briefly for container to be ready
      await new Promise((r) => setTimeout(r, 2000));

      // Step 3: Publish the container
      const publishResponse = await fetch(`${META_BASE_URL}/${META_IG_USER_ID}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: META_PAGE_ACCESS_TOKEN,
        }),
      });

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) {
        const errorMsg = publishData.error?.message || `Instagram publish error: ${publishResponse.status}`;
        return { success: false, external_post_id: null, error: errorMsg };
      }

      return {
        success: true,
        external_post_id: publishData.id,
      };
    } catch (err) {
      return {
        success: false,
        external_post_id: null,
        error: err instanceof Error ? err.message : "Instagram publish error",
      };
    }
  }

  // Mock fallback
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `ig_mock_${Date.now()}`, mock: true };
}

async function publishToX(_post: Record<string, unknown>): Promise<PublishResult> {
  // Mock — ready for X API v2 when tokens are configured
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `x_mock_${Date.now()}`, mock: true };
}

async function publishToLinkedIn(_post: Record<string, unknown>): Promise<PublishResult> {
  // Mock — ready for LinkedIn Marketing API when tokens are configured
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `li_mock_${Date.now()}`, mock: true };
}

async function publishToWhatsApp(_post: Record<string, unknown>): Promise<PublishResult> {
  // Mock — ready for WhatsApp Cloud API (template campaigns)
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `wa_mock_${Date.now()}`, mock: true };
}

function getPublisher(platform: string): (post: Record<string, unknown>) => Promise<PublishResult> {
  switch (platform) {
    case "facebook": return publishToFacebook;
    case "instagram": return publishToInstagram;
    case "x": return publishToX;
    case "linkedin": return publishToLinkedIn;
    case "whatsapp": return publishToWhatsApp;
    default: throw new Error(`Plateforme inconnue: ${platform}`);
  }
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(createHandler({
  name: "publish-social-post",
  auth: "admin",
  rateLimit: { prefix: "publish-social-post", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const startTime = Date.now();
  const { post_id } = body as PublishRequest;

  if (!post_id) {
    return jsonResponse(
      { error: "Champ requis manquant : post_id" },
      400,
      corsHeaders,
    );
  }

  // 1. Fetch post
  const { data: post, error: postError } = await supabaseAdmin
    .from("social_posts")
    .select("*, social_campaigns(*)")
    .eq("id", post_id)
    .single();

  if (postError || !post) {
    return jsonResponse(
      { error: "Publication introuvable" },
      404,
      corsHeaders,
    );
  }

  // 2. Validate status
  if (post.status !== "approved") {
    return jsonResponse(
      { error: "La publication doit être approuvée avant d'être publiée" },
      400,
      corsHeaders,
    );
  }

  // 2b. Check retry limit (max 3 attempts)
  const MAX_RETRIES = 3;
  if ((post.retry_count || 0) >= MAX_RETRIES) {
    return jsonResponse(
      { error: "Nombre maximum de tentatives atteint. Intervention manuelle requise." },
      400,
      corsHeaders,
    );
  }

  // 3. Set status to publishing and increment retry count
  await supabaseAdmin
    .from("social_posts")
    .update({ status: "publishing", retry_count: (post.retry_count || 0) + 1 })
    .eq("id", post_id);

  // 4. Publish via platform publisher
  const publisher = getPublisher(post.platform);
  const result = await publisher(post);

  if (result.success) {
    // 5a. Update post as published
    await supabaseAdmin
      .from("social_posts")
      .update({
        status: "published",
        external_post_id: result.external_post_id,
        published_at: new Date().toISOString(),
      })
      .eq("id", post_id);

    // 6. Log success
    await supabaseAdmin.from("social_publication_logs").insert({
      post_id,
      action: "publish",
      status: "success",
      duration_ms: Date.now() - startTime,
      response_data: {
        external_post_id: result.external_post_id,
        platform: post.platform,
        mock: result.mock || false,
      },
    });

    // 7. Check if all posts in campaign are published
    const { data: allPosts } = await supabaseAdmin
      .from("social_posts")
      .select("status")
      .eq("campaign_id", post.campaign_id);

    const allPublished = allPosts?.every(
      (p: { status: string }) => p.status === "published" || p.status === "skipped"
    );

    if (allPublished) {
      await supabaseAdmin
        .from("social_campaigns")
        .update({ status: "published" })
        .eq("id", post.campaign_id);
    }

    return {
      success: true,
      external_post_id: result.external_post_id,
      platform: post.platform,
      mock: result.mock || false,
    };
  } else {
    // 5b. Update post as failed
    await supabaseAdmin
      .from("social_posts")
      .update({ status: "failed", error_message: result.error })
      .eq("id", post_id);

    await supabaseAdmin.from("social_publication_logs").insert({
      post_id,
      action: "publish",
      status: "error",
      duration_ms: Date.now() - startTime,
      error_message: result.error,
    });

    return jsonResponse(
      { success: false, error: result.error || "Échec de la publication" },
      500,
      corsHeaders,
    );
  }
}));
