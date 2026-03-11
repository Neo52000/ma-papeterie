import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";

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

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;
  const cors = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "publish-social-post");
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(cors);
  }

  try {
    // ── Auth (admin uniquement) ─────────────────────────────────────────────
    const authResult = await requireAdmin(req, cors);
    if (isAuthError(authResult)) return authResult.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const startTime = Date.now();
    const { post_id } = (await req.json()) as PublishRequest;

    if (!post_id) {
      return new Response(
        JSON.stringify({ error: "Champ requis manquant : post_id" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch post
    const { data: post, error: postError } = await supabase
      .from("social_posts")
      .select("*, social_campaigns(*)")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Publication introuvable" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate status
    if (post.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "La publication doit être approuvée avant d'être publiée" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 2b. Check retry limit (max 3 attempts)
    const MAX_RETRIES = 3;
    if ((post.retry_count || 0) >= MAX_RETRIES) {
      return new Response(
        JSON.stringify({ error: "Nombre maximum de tentatives atteint. Intervention manuelle requise." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 3. Set status to publishing and increment retry count
    await supabase
      .from("social_posts")
      .update({ status: "publishing", retry_count: (post.retry_count || 0) + 1 })
      .eq("id", post_id);

    // 4. Publish via platform publisher
    const publisher = getPublisher(post.platform);
    const result = await publisher(post);

    if (result.success) {
      // 5a. Update post as published
      await supabase
        .from("social_posts")
        .update({
          status: "published",
          external_post_id: result.external_post_id,
          published_at: new Date().toISOString(),
        })
        .eq("id", post_id);

      // 6. Log success
      await supabase.from("social_publication_logs").insert({
        post_id,
        action: "publish",
        status: "success",
        duration_ms: Date.now() - startTime,
        response_data: { external_post_id: result.external_post_id, platform: post.platform, mock: true },
      });

      // 7. Check if all posts in campaign are published
      const { data: allPosts } = await supabase
        .from("social_posts")
        .select("status")
        .eq("campaign_id", post.campaign_id);

      const allPublished = allPosts?.every(
        (p: { status: string }) => p.status === "published" || p.status === "skipped"
      );

      if (allPublished) {
        await supabase
          .from("social_campaigns")
          .update({ status: "published" })
          .eq("id", post.campaign_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          external_post_id: result.external_post_id,
          platform: post.platform,
          mock: true,
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    } else {
      // 5b. Update post as failed
      await supabase
        .from("social_posts")
        .update({ status: "failed", error_message: result.error })
        .eq("id", post_id);

      await supabase.from("social_publication_logs").insert({
        post_id,
        action: "publish",
        status: "error",
        duration_ms: Date.now() - startTime,
        error_message: result.error,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Échec de la publication" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return safeErrorResponse(error, cors, { context: "publish-social-post" });
  }
});
