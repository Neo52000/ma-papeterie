import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_DOMAIN = "ma-papeterie-pro-boutique-hcd1j.myshopify.com";
const SHOPIFY_API_VERSION = "2025-01";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (!SHOPIFY_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const startTime = Date.now();

  try {
    const { mode = "all", product_ids } = await req.json().catch(() => ({}));

    // Fetch vendable products from the view
    let query = supabase.from("v_products_vendable").select("*").eq("is_vendable", true);
    if (mode === "specific" && product_ids?.length) {
      query = query.in("id", product_ids);
    }
    const { data: products, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: "No vendable products to sync", synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch existing sync mappings
    const { data: existingSyncs } = await supabase
      .from("shopify_sync_log")
      .select("product_id, shopify_product_id")
      .eq("status", "success")
      .in("product_id", products.map(p => p.id))
      .order("synced_at", { ascending: false });

    const syncMap = new Map<string, string>();
    existingSyncs?.forEach(s => {
      if (s.product_id && s.shopify_product_id && !syncMap.has(s.product_id)) {
        syncMap.set(s.product_id, s.shopify_product_id);
      }
    });

    // Fetch product images
    const { data: allImages } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", products.map(p => p.id))
      .order("is_principal", { ascending: false });

    const imagesByProduct = new Map<string, any[]>();
    allImages?.forEach(img => {
      const list = imagesByProduct.get(img.product_id) || [];
      list.push(img);
      imagesByProduct.set(img.product_id, list);
    });

    let created = 0, updated = 0, errors = 0;

    for (const product of products) {
      try {
        const images = imagesByProduct.get(product.id!) || [];
        const shopifyImages = images.map(img => ({
          src: img.url_optimisee || img.url_originale,
          alt: img.alt_seo || product.name,
        }));

        // Add main image_url fallback
        if (shopifyImages.length === 0 && product.image_url) {
          shopifyImages.push({ src: product.image_url, alt: product.name });
        }

        const shopifyProductData = {
          product: {
            title: product.name,
            body_html: product.description || "",
            product_type: product.category || "",
            tags: [product.badge, product.eco ? "eco" : null].filter(Boolean).join(", "),
            variants: [{
              price: String(product.price_ttc || product.price || 0),
              sku: product.sku_interne || product.ean || "",
              barcode: product.ean || "",
              inventory_quantity: product.stock_quantity || 0,
              inventory_management: "shopify",
              weight: product.weight_kg ? Number(product.weight_kg) : undefined,
              weight_unit: "kg",
            }],
            images: shopifyImages.length > 0 ? shopifyImages : undefined,
          }
        };

        const existingShopifyId = syncMap.get(product.id!);
        let response: Response;
        let syncType: string;

        if (existingShopifyId) {
          // UPDATE existing product
          syncType = "update";
          response = await fetch(
            `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${existingShopifyId}.json`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
              },
              body: JSON.stringify(shopifyProductData),
            }
          );
        } else {
          // CREATE new product
          syncType = "create";
          response = await fetch(
            `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
              },
              body: JSON.stringify(shopifyProductData),
            }
          );
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(JSON.stringify(result.errors || result));
        }

        const shopifyProductId = String(result.product?.id || existingShopifyId);

        await supabase.from("shopify_sync_log").insert({
          product_id: product.id,
          shopify_product_id: shopifyProductId,
          sync_type: syncType,
          status: "success",
          details: { price: product.price_ttc, stock: product.stock_quantity },
        });

        if (syncType === "create") created++;
        else updated++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (productError: any) {
        errors++;
        await supabase.from("shopify_sync_log").insert({
          product_id: product.id,
          sync_type: "error",
          status: "error",
          error_message: productError.message?.substring(0, 500),
        });
      }
    }

    const duration = Date.now() - startTime;

    // Log agent execution
    await supabase.from("agent_logs").insert({
      agent_name: "sync-shopify",
      action: "sync_products",
      status: errors === 0 ? "success" : "partial",
      duration_ms: duration,
      output_data: { created, updated, errors, total: products.length },
    });

    return new Response(JSON.stringify({
      message: "Sync completed",
      created,
      updated,
      errors,
      total: products.length,
      duration_ms: duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    await supabase.from("agent_logs").insert({
      agent_name: "sync-shopify",
      action: "sync_products",
      status: "error",
      duration_ms: duration,
      error_message: error.message,
    });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
