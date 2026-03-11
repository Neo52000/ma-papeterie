import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

// ── Types ───────────────────────────────────────────────────────────────────

interface PublishRequest {
  post_id: string;
}

interface PublishResult {
  success: boolean;
  external_post_id: string | null;
  error?: string;
}

// ── Config ──────────────────────────────────────────────────────────────────

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Publishers (MVP: mock implementations) ──────────────────────────────────

async function publishToFacebook(_post: Record<string, unknown>): Promise<PublishResult> {
  // V2: Meta Graph API integration
  // const META_PAGE_ACCESS_TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN");
  // const META_PAGE_ID = Deno.env.get("META_PAGE_ID");
  await new Promise((r) => setTimeout(r, 200));
  return {
    success: true,
    external_post_id: `fb_mock_${Date.now()}`,
  };
}

async function publishToInstagram(_post: Record<string, unknown>): Promise<PublishResult> {
  // V2: Meta Graph API (container + publish flow)
  // const META_IG_ACCOUNT_ID = Deno.env.get("META_IG_ACCOUNT_ID");
  await new Promise((r) => setTimeout(r, 200));
  return {
    success: true,
    external_post_id: `ig_mock_${Date.now()}`,
  };
}

async function publishToX(_post: Record<string, unknown>): Promise<PublishResult> {
  // V2: X API v2
  // const X_API_KEY = Deno.env.get("X_API_KEY");
  await new Promise((r) => setTimeout(r, 200));
  return {
    success: true,
    external_post_id: `x_mock_${Date.now()}`,
  };
}

async function publishToLinkedIn(_post: Record<string, unknown>): Promise<PublishResult> {
  // V2: LinkedIn API with OAuth2
  // const LINKEDIN_ACCESS_TOKEN = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
  // const LINKEDIN_ORGANIZATION_ID = Deno.env.get("LINKEDIN_ORGANIZATION_ID");
  await new Promise((r) => setTimeout(r, 200));
  return {
    success: true,
    external_post_id: `li_mock_${Date.now()}`,
  };
}

function getPublisher(platform: string): (post: Record<string, unknown>) => Promise<PublishResult> {
  switch (platform) {
    case "facebook": return publishToFacebook;
    case "instagram": return publishToInstagram;
    case "x": return publishToX;
    case "linkedin": return publishToLinkedIn;
    default: throw new Error(`Unknown platform: ${platform}`);
  }
}

// ── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req);
  const startTime = Date.now();

  try {
    const { post_id } = (await req.json()) as PublishRequest;

    if (!post_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: post_id" }),
        { status: 400, headers: { ...cors, "content-type": "application/json" } }
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
        JSON.stringify({ error: "Post not found" }),
        { status: 404, headers: { ...cors, "content-type": "application/json" } }
      );
    }

    // 2. Validate status
    if (post.status !== "approved") {
      return new Response(
        JSON.stringify({ error: `Post must be approved before publishing. Current status: ${post.status}` }),
        { status: 400, headers: { ...cors, "content-type": "application/json" } }
      );
    }

    // 2b. Check retry limit (max 3 attempts)
    const MAX_RETRIES = 3;
    if ((post.retry_count || 0) >= MAX_RETRIES) {
      return new Response(
        JSON.stringify({ error: `Max retries (${MAX_RETRIES}) reached for this post. Manual intervention required.` }),
        { status: 400, headers: { ...cors, "content-type": "application/json" } }
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

      // 7. Check if all posts in campaign are published → update campaign status
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
        { status: 200, headers: { ...cors, "content-type": "application/json" } }
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
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...cors, "content-type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("publish-social-post error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "content-type": "application/json" } }
    );
  }
});
