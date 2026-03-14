import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

const SHOPIFY_API_VERSION = "2025-01";

interface ShopifyConfig {
  shop_domain: string;
  access_token: string;
  sync_collections: boolean;
  sync_metafields: boolean;
}

async function getShopifyConfig(supabase: any): Promise<ShopifyConfig> {
  // Tenter de charger depuis shopify_config, sinon fallback sur env vars
  const { data: config } = await supabase
    .from("shopify_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  return {
    shop_domain: config?.shop_domain || Deno.env.get("SHOPIFY_SHOP_DOMAIN") || "",
    access_token: Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "",
    sync_collections: config?.sync_collections ?? true,
    sync_metafields: config?.sync_metafields ?? true,
  };
}

async function shopifyFetch(
  config: ShopifyConfig,
  path: string,
  method = "GET",
  body?: any,
): Promise<any> {
  const url = `https://${config.shop_domain}/admin/api/${SHOPIFY_API_VERSION}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.access_token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Respecter le rate limit Shopify (bucket leaky, 2 req/sec pour REST)
  const callLimit = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
  if (callLimit) {
    const [used, max] = callLimit.split("/").map(Number);
    if (used > max * 0.8) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const result = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(result.errors || result));
  }
  return result;
}

// ── Collections Shopify ──

async function syncCollections(
  supabase: any,
  config: ShopifyConfig,
): Promise<{ created: number; updated: number; errors: number }> {
  const stats = { created: 0, updated: 0, errors: 0 };

  // Charger les catégories de niveau "famille" (top-level)
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url")
    .eq("level", "famille")
    .eq("is_active", true)
    .order("sort_order");

  if (!categories?.length) return stats;

  // Charger les collections Shopify existantes
  const existing = await shopifyFetch(config, "/smart_collections.json?limit=250");
  const existingMap = new Map<string, number>();
  for (const col of existing.smart_collections || []) {
    // Stocker par titre normalisé
    existingMap.set(col.title.toLowerCase(), col.id);
  }

  for (const cat of categories) {
    try {
      const collectionData = {
        smart_collection: {
          title: cat.name,
          body_html: cat.description || "",
          rules: [
            {
              column: "type",
              relation: "equals",
              condition: cat.name,
            },
          ],
          published: true,
          ...(cat.image_url ? { image: { src: cat.image_url, alt: cat.name } } : {}),
        },
      };

      const existingId = existingMap.get(cat.name.toLowerCase());
      if (existingId) {
        await shopifyFetch(config, `/smart_collections/${existingId}.json`, "PUT", collectionData);
        stats.updated++;
      } else {
        await shopifyFetch(config, "/smart_collections.json", "POST", collectionData);
        stats.created++;
      }
    } catch {
      stats.errors++;
    }
  }

  return stats;
}

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "sync-shopify");
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) return authResult.error;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const config = await getShopifyConfig(supabase);
  if (!config.access_token) {
    return new Response(
      JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const startTime = Date.now();

  try {
    const { mode = "all", product_ids, sync_type = "products" } = await req.json().catch(() => ({}));

    // ── Sync collections d'abord si demandé ──
    let collectionStats = { created: 0, updated: 0, errors: 0 };
    if ((sync_type === "all" || sync_type === "collections") && config.sync_collections) {
      collectionStats = await syncCollections(supabase, config);
    }

    if (sync_type === "collections") {
      return new Response(
        JSON.stringify({ message: "Collections sync completed", collections: collectionStats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Sync produits ──
    let query = supabase.from("v_products_vendable").select("*").eq("is_vendable", true);
    if (mode === "specific" && product_ids?.length) {
      query = query.in("id", product_ids);
    }
    const { data: products, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: "No vendable products to sync", synced: 0, collections: collectionStats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch existing sync mappings
    const { data: existingSyncs } = await supabase
      .from("shopify_sync_log")
      .select("product_id, shopify_product_id")
      .eq("status", "success")
      .in("product_id", products.map((p: any) => p.id))
      .order("synced_at", { ascending: false });

    const syncMap = new Map<string, string>();
    existingSyncs?.forEach((s: any) => {
      if (s.product_id && s.shopify_product_id && !syncMap.has(s.product_id)) {
        syncMap.set(s.product_id, s.shopify_product_id);
      }
    });

    // Fetch product images
    const { data: allImages } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", products.map((p: any) => p.id))
      .order("is_principal", { ascending: false });

    const imagesByProduct = new Map<string, any[]>();
    allImages?.forEach((img: any) => {
      const list = imagesByProduct.get(img.product_id) || [];
      list.push(img);
      imagesByProduct.set(img.product_id, list);
    });

    // Fetch volume pricing tiers
    const { data: allVolumePricing } = await supabase
      .from("product_volume_pricing")
      .select("*")
      .in("product_id", products.map((p: any) => p.id))
      .order("min_quantity");

    const volumePricingByProduct = new Map<string, any[]>();
    allVolumePricing?.forEach((vp: any) => {
      const list = volumePricingByProduct.get(vp.product_id) || [];
      list.push(vp);
      volumePricingByProduct.set(vp.product_id, list);
    });

    // Fetch supplier references for POS
    const { data: supplierProducts } = await supabase
      .from("supplier_products")
      .select("product_id, supplier_reference, supplier_price")
      .in("product_id", products.map((p: any) => p.id))
      .eq("is_preferred", true);

    const supplierRefMap = new Map<string, { ref: string; cost: number | null }>();
    supplierProducts?.forEach((sp: any) => {
      if (!supplierRefMap.has(sp.product_id)) {
        supplierRefMap.set(sp.product_id, {
          ref: sp.supplier_reference,
          cost: sp.supplier_price,
        });
      }
    });

    let created = 0, updated = 0, errors = 0;

    for (const product of products) {
      try {
        const images = imagesByProduct.get(product.id!) || [];
        const shopifyImages = images.map((img: any) => ({
          src: img.url_optimisee || img.url_originale,
          alt: img.alt_seo || product.name,
        }));

        if (shopifyImages.length === 0 && product.image_url) {
          shopifyImages.push({ src: product.image_url, alt: product.name });
        }

        // ── Build metafields ──
        const volumeTiers = volumePricingByProduct.get(product.id!) || [];
        const metafields: any[] = [];

        // Volume pricing metafield
        if (volumeTiers.length > 0) {
          const tiersJson = volumeTiers.map((t: any) => ({
            min_qty: t.min_quantity,
            max_qty: t.max_quantity,
            price_ht: Number(t.price_ht),
            price_ttc: Number(t.price_ttc),
            discount_pct: t.discount_percent ? Number(t.discount_percent) : null,
          }));

          metafields.push({
            namespace: "ma_papeterie",
            key: "volume_pricing",
            value: JSON.stringify(tiersJson),
            type: "json",
          });

          const tierLabels = tiersJson
            .map((t: any) => `${t.min_qty}${t.max_qty ? `-${t.max_qty}` : "+"}: ${t.price_ttc.toFixed(2)}€`)
            .join(" | ");

          metafields.push({
            namespace: "ma_papeterie",
            key: "volume_pricing_label",
            value: `Tarifs dégressifs: ${tierLabels}`,
            type: "single_line_text_field",
          });
        }

        // POS metafields : référence fournisseur
        const supplierRef = supplierRefMap.get(product.id!);
        if (supplierRef) {
          metafields.push({
            namespace: "ma_papeterie",
            key: "supplier_ref",
            value: supplierRef.ref,
            type: "single_line_text_field",
          });
          if (supplierRef.cost) {
            metafields.push({
              namespace: "ma_papeterie",
              key: "cost_price",
              value: String(supplierRef.cost),
              type: "number_decimal",
            });
          }
        }

        // EAN metafield pour scanner POS
        if (product.ean) {
          metafields.push({
            namespace: "ma_papeterie",
            key: "barcode_ean",
            value: product.ean,
            type: "single_line_text_field",
          });
        }

        // SEO metafields
        if (product.meta_title || product.name) {
          metafields.push({
            namespace: "global",
            key: "title_tag",
            value: (product.meta_title || product.name).substring(0, 70),
            type: "single_line_text_field",
          });
        }
        if (product.meta_description || product.description) {
          metafields.push({
            namespace: "global",
            key: "description_tag",
            value: (product.meta_description || product.description || "").substring(0, 320),
            type: "single_line_text_field",
          });
        }

        // ── Build tags structurés ──
        const tags: string[] = [];
        if (product.brand) tags.push(`marque:${product.brand}`);
        if (product.category) tags.push(`famille:${product.category}`);
        if (product.subcategory) tags.push(`sous-famille:${product.subcategory}`);
        if (product.eco) tags.push("eco-responsable");
        if (product.badge) tags.push(product.badge);

        const shopifyProductData = {
          product: {
            title: product.name,
            body_html: product.description || "",
            product_type: product.category || "",
            tags: tags.filter(Boolean).join(", "),
            vendor: product.brand || "Ma Papeterie",
            variants: [
              {
                price: String(product.price_ttc || product.price || 0),
                compare_at_price: product.price_before_discount
                  ? String(product.price_before_discount)
                  : undefined,
                sku: product.sku_interne || product.ean || "",
                barcode: product.ean || "",
                inventory_quantity: product.stock_quantity || 0,
                inventory_management: "shopify",
                weight: product.weight_kg ? Number(product.weight_kg) : undefined,
                weight_unit: "kg",
                taxable: true,
              },
            ],
            images: shopifyImages.length > 0 ? shopifyImages : undefined,
            metafields: metafields.length > 0 ? metafields : undefined,
          },
        };

        const existingShopifyId = syncMap.get(product.id!);
        let syncType: string;

        if (existingShopifyId) {
          syncType = "update";
          await shopifyFetch(config, `/products/${existingShopifyId}.json`, "PUT", shopifyProductData);
        } else {
          syncType = "create";
          const result = await shopifyFetch(config, "/products.json", "POST", shopifyProductData);
          const shopifyProductId = String(result.product?.id);

          await supabase.from("shopify_sync_log").insert({
            product_id: product.id,
            shopify_product_id: shopifyProductId,
            sync_type: syncType,
            sync_direction: "push",
            status: "success",
            details: { price: product.price_ttc, stock: product.stock_quantity },
          });

          if (syncType === "create") created++;
          continue; // Skip the common log below since we already logged for create
        }

        await supabase.from("shopify_sync_log").insert({
          product_id: product.id,
          shopify_product_id: existingShopifyId,
          sync_type: syncType,
          sync_direction: "push",
          status: "success",
          details: { price: product.price_ttc, stock: product.stock_quantity },
        });

        if (syncType === "update") updated++;
      } catch (productError: any) {
        errors++;
        await supabase.from("shopify_sync_log").insert({
          product_id: product.id,
          sync_type: "error",
          sync_direction: "push",
          status: "error",
          error_message: productError.message?.substring(0, 500),
        });
      }
    }

    const duration = Date.now() - startTime;

    await supabase.from("agent_logs").insert({
      agent_name: "sync-shopify",
      action: "sync_products",
      status: errors === 0 ? "success" : "partial",
      duration_ms: duration,
      output_data: { created, updated, errors, total: products.length, collections: collectionStats },
    });

    return new Response(
      JSON.stringify({
        message: "Sync completed",
        created,
        updated,
        errors,
        total: products.length,
        collections: collectionStats,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    await supabase.from("agent_logs").insert({
      agent_name: "sync-shopify",
      action: "sync_products",
      status: "error",
      duration_ms: duration,
      error_message: error.message,
    });

    return new Response(JSON.stringify({ error: "Erreur lors de la sync Shopify" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
