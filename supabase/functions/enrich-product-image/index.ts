import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
];

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "super_admin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product_id, image_url } = await req.json();

    if (!product_id || !image_url) {
      return new Response(
        JSON.stringify({ error: "product_id et image_url requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify product exists
    const { data: product, error: prodError } = await adminClient
      .from("products")
      .select("id, name")
      .eq("id", product_id)
      .single();

    if (prodError || !product) {
      return new Response(
        JSON.stringify({ error: "Produit non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download image with browser-like headers
    const imgResponse = await fetch(image_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": new URL(image_url).origin + "/",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!imgResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Impossible de télécharger l'image: HTTP ${imgResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = imgResponse.headers.get("content-type")?.split(";")[0]?.trim() || "";
    
    // Be flexible with content-type: accept if it looks like an image
    const isImage = ALLOWED_TYPES.includes(contentType) || contentType.startsWith("image/");
    if (!isImage) {
      // Try to detect by URL extension
      const ext = image_url.split("?")[0].split(".").pop()?.toLowerCase();
      const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"];
      if (!ext || !imageExtensions.includes(ext)) {
        return new Response(
          JSON.stringify({ error: `Le fichier n'est pas une image (content-type: ${contentType})` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const imageBuffer = await imgResponse.arrayBuffer();
    
    if (imageBuffer.byteLength > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: `Image trop volumineuse (${(imageBuffer.byteLength / 1024 / 1024).toFixed(1)} MB, max 10 MB)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine file extension
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/avif": "avif",
    };
    let ext = extMap[contentType] || image_url.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
    if (!["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) {
      ext = "jpg";
    }

    const filename = `${Date.now()}.${ext}`;
    const storagePath = `${product_id}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from("product-images")
      .upload(storagePath, imageBuffer, {
        contentType: contentType.startsWith("image/") ? contentType : `image/${ext}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Erreur upload: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = adminClient.storage
      .from("product-images")
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // Update product
    const { error: updateError } = await adminClient
      .from("products")
      .update({ image_url: publicUrl })
      .eq("id", product_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: `Erreur mise à jour produit: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        product_id,
        product_name: product.name,
        image_url: publicUrl,
        size_bytes: imageBuffer.byteLength,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
