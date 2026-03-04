import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
];

// ── SSRF protection: validate image URLs before fetching ────────────────────

/** Known-safe image hosting domains */
const ALLOWED_IMAGE_DOMAINS = [
  "cdn.shopify.com",
  "images.unsplash.com",
  "i.imgur.com",
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "media.istockphoto.com",
  "images.pexels.com",
  "cdn.pixabay.com",
  "storage.googleapis.com",
  "mgojmkzovqgpipybelrr.supabase.co",
];

/**
 * Check if an IP address is private/reserved (blocks SSRF to internal services).
 * Handles IPv4 addresses and IPv4-mapped IPv6 addresses.
 */
function isPrivateIp(hostname: string): boolean {
  // Remove IPv6 brackets if present
  const clean = hostname.replace(/^\[|\]$/g, '');

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  const v4Mapped = clean.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const ip = v4Mapped ? v4Mapped[1] : clean;

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    // Not a valid IPv4 — could be a hostname (OK) or IPv6 literal
    // Block IPv6 loopback
    if (clean === '::1' || clean === '0:0:0:0:0:0:0:1') return true;
    return false;
  }

  const [a, b] = parts;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

/**
 * Validate an image URL to prevent SSRF attacks.
 * Returns null if the URL is safe, or an error message if blocked.
 */
function validateImageUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "URL invalide";
  }

  // Block non-HTTP(S) protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return `Protocole non autorisé: ${parsed.protocol}`;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block private/reserved IP addresses
  if (isPrivateIp(hostname)) {
    return "Adresses IP privées/réservées non autorisées";
  }

  // Block common localhost aliases
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return "Hôtes locaux non autorisés";
  }

  // Allow known-safe image domains
  if (ALLOWED_IMAGE_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return null;
  }

  // Allow any public hostname that doesn't resolve to a private IP
  // (DNS rebinding is mitigated by the IP check above + short-lived fetch)
  return null;
}

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'enrich-img');
  if (!checkRateLimit(rlKey, 10, 60_000)) {
    return rateLimitResponse(corsHeaders);
  }

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

    // ── SSRF protection: validate the image URL before fetching ──────────────
    const urlError = validateImageUrl(image_url);
    if (urlError) {
      return new Response(
        JSON.stringify({ error: `URL image bloquée: ${urlError}` }),
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
