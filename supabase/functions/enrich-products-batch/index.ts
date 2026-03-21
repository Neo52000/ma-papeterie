import { createHandler, jsonResponse } from "../_shared/handler.ts";

const MAX_SIZE = 10 * 1024 * 1024;

Deno.serve(createHandler({
  name: "enrich-products-batch",
  auth: "admin",
  rateLimit: { prefix: "enrich-batch", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { items } = body as { items: any[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return jsonResponse(
      { error: "Le champ 'items' est requis (tableau non vide)" },
      400,
      corsHeaders,
    );
  }

  if (items.length > 100) {
    return jsonResponse(
      { error: "Maximum 100 items par lot" },
      400,
      corsHeaders,
    );
  }

  // Fetch all products for matching
  const { data: allProducts } = await supabaseAdmin
    .from("products")
    .select("id, name, ean");

  const products = allProducts || [];

  const results: Array<{
    index: number;
    status: "success" | "error";
    product_name?: string;
    product_id?: string;
    image_url?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { product_name, ean, image_url } = item;

    if (!image_url) {
      results.push({ index: i, status: "error", error: "image_url manquant" });
      continue;
    }

    // Match product
    let matched = null;
    if (ean) {
      matched = products.find((p) => p.ean && p.ean === ean);
    }
    if (!matched && product_name) {
      // Try exact match first
      matched = products.find(
        (p) => p.name.toLowerCase() === product_name.toLowerCase()
      );
      // Then partial match
      if (!matched) {
        matched = products.find(
          (p) =>
            p.name.toLowerCase().includes(product_name.toLowerCase()) ||
            product_name.toLowerCase().includes(p.name.toLowerCase())
        );
      }
    }

    if (!matched) {
      results.push({
        index: i,
        status: "error",
        error: `Aucun produit trouvé pour ${ean ? "EAN: " + ean : "nom: " + product_name}`,
      });
      continue;
    }

    try {
      // Download image
      const imgResponse = await fetch(image_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": new URL(image_url).origin + "/",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!imgResponse.ok) {
        results.push({
          index: i,
          status: "error",
          product_name: matched.name,
          error: `HTTP ${imgResponse.status} lors du téléchargement`,
        });
        continue;
      }

      const imageBuffer = await imgResponse.arrayBuffer();
      if (imageBuffer.byteLength > MAX_SIZE) {
        results.push({
          index: i,
          status: "error",
          product_name: matched.name,
          error: "Image trop volumineuse (max 10 MB)",
        });
        continue;
      }

      const contentType = imgResponse.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
      const extMap: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
        "image/webp": "webp", "image/svg+xml": "svg", "image/avif": "avif",
      };
      let ext = extMap[contentType] || image_url.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
      if (!["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) ext = "jpg";

      const filename = `${Date.now()}_${i}.${ext}`;
      const storagePath = `${matched.id}/${filename}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(storagePath, imageBuffer, {
          contentType: contentType.startsWith("image/") ? contentType : `image/${ext}`,
          upsert: true,
        });

      if (uploadError) {
        results.push({
          index: i,
          status: "error",
          product_name: matched.name,
          error: `Upload: ${uploadError.message}`,
        });
        continue;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("product-images")
        .getPublicUrl(storagePath);

      await supabaseAdmin
        .from("products")
        .update({ image_url: publicUrlData.publicUrl })
        .eq("id", matched.id);

      results.push({
        index: i,
        status: "success",
        product_name: matched.name,
        product_id: matched.id,
        image_url: publicUrlData.publicUrl,
      });
    } catch (err) {
      results.push({
        index: i,
        status: "error",
        product_name: matched?.name,
        error: err.message || "Erreur inattendue",
      });
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return { success: true, total: items.length, successCount, errorCount, results };
}));
