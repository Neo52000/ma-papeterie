import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "get-crawl-job",
  auth: "admin",
  methods: ["GET", "POST"],
  rateLimit: { prefix: "get-crawl", max: 5, windowMs: 60_000 },
  rawBody: true,
}, async ({ supabaseAdmin, req, corsHeaders }) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const search = url.searchParams.get("search") || "";

  if (!jobId) {
    return jsonResponse({ error: "jobId requis" }, 400, corsHeaders);
  }

  // Get job details
  const { data: job, error: jobError } = await supabaseAdmin
    .from("crawl_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return jsonResponse({ error: "Job non trouvé" }, 404, corsHeaders);
  }

  // Get images with pagination and optional search
  let imagesQuery = supabaseAdmin
    .from("crawl_images")
    .select("*", { count: "exact" })
    .eq("job_id", jobId)
    .not("storage_path", "is", null);

  if (search) {
    imagesQuery = imagesQuery.or(`source_url.ilike.%${search}%,page_url.ilike.%${search}%`);
  }

  const { data: images, count, error: imagesError } = await imagesQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (imagesError) {
    console.error("Error fetching images:", imagesError);
  }

  // Generate signed URLs for images
  const imagesWithUrls = [];
  if (images) {
    for (const img of images) {
      if (img.storage_path) {
        const { data: signedData } = await supabaseAdmin.storage
          .from("image-crawls")
          .createSignedUrl(img.storage_path, 3600); // 1 hour expiry

        imagesWithUrls.push({
          ...img,
          signed_url: signedData?.signedUrl || null,
        });
      } else {
        imagesWithUrls.push({ ...img, signed_url: null });
      }
    }
  }

  // Get page stats
  const { count: pagesCount } = await supabaseAdmin
    .from("crawl_pages")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId);

  return {
    job,
    images: imagesWithUrls,
    total_images: count || 0,
    total_pages: pagesCount || 0,
    limit,
    offset,
  };
}));
