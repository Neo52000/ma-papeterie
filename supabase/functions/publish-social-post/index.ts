import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface PublishRequest {
  post_id: string;
}

interface PublishResult {
  success: boolean;
  external_post_id: string | null;
  error?: string;
}

// ── Publishers (MVP: mock implementations) ──────────────────────────────────

async function publishToFacebook(_post: Record<string, unknown>): Promise<PublishResult> {
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `fb_mock_${Date.now()}` };
}

async function publishToInstagram(_post: Record<string, unknown>): Promise<PublishResult> {
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `ig_mock_${Date.now()}` };
}

async function publishToX(_post: Record<string, unknown>): Promise<PublishResult> {
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `x_mock_${Date.now()}` };
}

async function publishToLinkedIn(_post: Record<string, unknown>): Promise<PublishResult> {
  await new Promise((r) => setTimeout(r, 200));
  return { success: true, external_post_id: `li_mock_${Date.now()}` };
}

function getPublisher(platform: string): (post: Record<string, unknown>) => Promise<PublishResult> {
  switch (platform) {
    case "facebook": return publishToFacebook;
    case "instagram": return publishToInstagram;
    case "x": return publishToX;
    case "linkedin": return publishToLinkedIn;
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
      response_data: { external_post_id: result.external_post_id, platform: post.platform, mock: true },
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
      mock: true,
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
      { success: false, error: "Échec de la publication" },
      500,
      corsHeaders,
    );
  }
}));
