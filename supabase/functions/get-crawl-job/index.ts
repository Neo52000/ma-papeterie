import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "super_admin"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Accès réservé aux administrateurs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const search = url.searchParams.get("search") || "";

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("crawl_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get images with pagination and optional search
    let imagesQuery = supabase
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
          const { data: signedData } = await supabase.storage
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
    const { count: pagesCount } = await supabase
      .from("crawl_pages")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId);

    return new Response(
      JSON.stringify({
        job,
        images: imagesWithUrls,
        total_images: count || 0,
        total_pages: pagesCount || 0,
        limit,
        offset,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-crawl-job error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
