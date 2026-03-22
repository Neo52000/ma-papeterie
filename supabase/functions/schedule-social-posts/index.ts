import { createHandler, jsonResponse } from "../_shared/handler.ts";

// ── Main Handler ────────────────────────────────────────────────────────────
// Cron-callable function: publishes posts whose scheduled_for is in the past.
// Auth: "admin-or-secret" so it can be called by cron (secret) or manually (admin).

Deno.serve(createHandler({
  name: "schedule-social-posts",
  auth: "admin-or-secret",
  rateLimit: { prefix: "schedule-social-posts", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin }) => {
  const now = new Date().toISOString();

  // 1. Query posts that should be published now
  const { data: duePosts, error } = await supabaseAdmin
    .from("social_posts")
    .select("id, platform, campaign_id")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  if (error) throw new Error(`Failed to fetch due posts: ${error.message}`);

  if (!duePosts || duePosts.length === 0) {
    return { success: true, published: 0, message: "No posts due for publication" };
  }

  // 2. For each due post, set to approved so the publish pipeline can handle it
  const results: { post_id: string; platform: string; status: string }[] = [];

  for (const post of duePosts) {
    try {
      // Set status to approved (publish-social-post requires approved status)
      await supabaseAdmin
        .from("social_posts")
        .update({ status: "approved" })
        .eq("id", post.id);

      // Invoke the publish function
      const { data: publishResult, error: publishError } = await supabaseAdmin
        .functions.invoke("publish-social-post", {
          body: { post_id: post.id },
        });

      if (publishError) {
        results.push({ post_id: post.id, platform: post.platform, status: "error" });

        await supabaseAdmin.from("social_publication_logs").insert({
          post_id: post.id,
          action: "scheduled_publish",
          status: "error",
          error_message: publishError.message,
        });
      } else {
        results.push({ post_id: post.id, platform: post.platform, status: "published" });
      }
    } catch (err) {
      results.push({
        post_id: post.id,
        platform: post.platform,
        status: "error",
      });

      await supabaseAdmin.from("social_publication_logs").insert({
        post_id: post.id,
        action: "scheduled_publish",
        status: "error",
        error_message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const published = results.filter((r) => r.status === "published").length;

  return {
    success: true,
    published,
    total: duePosts.length,
    results,
  };
}));
