import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { getShopifyConfig, shopifyFetch, type ShopifyConfig } from "../_shared/shopify-config.ts";

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

Deno.serve(createHandler({
  name: "sync-shopify",
  auth: "admin",
  rateLimit: { prefix: "sync-shopify", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const config = await getShopifyConfig(supabaseAdmin);
  if (!config.access_token) {
    return jsonResponse(
      { error: "SHOPIFY_ACCESS_TOKEN not configured" },
      500,
      corsHeaders,
    );
  }

  const startTime = Date.now();

  const { mode = "all", product_ids, sync_type = "products" } = (body as Record<string, any>) || {};

  // ── Sync collections d'abord si demandé ──
  let collectionStats = { created: 0, updated: 0, errors: 0 };
  if ((sync_type === "all" || sync_type === "collections") && config.sync_collections) {
    collectionStats = await syncCollections(supabaseAdmin, config);
  }

  if (sync_type === "collections") {
    return { message: "Collections sync completed", collections: collectionStats };
  }

  // ── Sync produits ──
  let query = supabaseAdmin.from("v_products_vendable").select("*").eq("is_vendable", true);
  if (mode === "specific" && product_ids?.length) {
    query = query.in("id", product_ids);
  }
  const { data: products, error: fetchError } = await query;
  if (fetchError) throw fetchError;

  if (!products || products.length === 0) {
    return { message: "No vendable products to sync", synced: 0, collections: collectionStats };
  }

  // Fetch existing product-shopify mappings (dedicated table, with sync_log fallback)
  const { data: existingMappings } = await supabaseAdmin
    .from("shopify_product_mapping")
    .select("product_id, shopify_product_id")
    .in("product_id", products.map((p: any) => p.id));

  const syncMap = new Map<string, string>();
  existingMappings?.forEach((m: any) => {
    if (m.product_id && m.shopify_product_id) {
      syncMap.set(m.product_id, m.shopify_product_id);
    }
  });

  // Fallback: check sync_log for any products not in mapping table
  const unmappedIds = products
    .map((p: any) => p.id)
    .filter((id: string) => !syncMap.has(id));

  if (unmappedIds.length > 0) {
    const { data: legacySyncs } = await supabaseAdmin
      .from("shopify_sync_log")
      .select("product_id, shopify_product_id")
      .eq("status", "success")
      .in("product_id", unmappedIds)
      .order("synced_at", { ascending: false });

    legacySyncs?.forEach((s: any) => {
      if (s.product_id && s.shopify_product_id && !syncMap.has(s.product_id)) {
        syncMap.set(s.product_id, s.shopify_product_id);
      }
    });
  }

  // Fetch product images
  const { data: allImages } = await supabaseAdmin
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
  const { data: allVolumePricing } = await supabaseAdmin
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
  const { data: supplierProducts } = await supabaseAdmin
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
        const shopifyVariantId = result.product?.variants?.[0]?.id
          ? String(result.product.variants[0].id)
          : null;
        const shopifyInventoryItemId = result.product?.variants?.[0]?.inventory_item_id
          ? String(result.product.variants[0].inventory_item_id)
          : null;

        // Insert into dedicated mapping table
        await supabaseAdmin.from("shopify_product_mapping").upsert({
          product_id: product.id,
          shopify_product_id: shopifyProductId,
          shopify_variant_id: shopifyVariantId,
          shopify_inventory_item_id: shopifyInventoryItemId,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "product_id" });

        await supabaseAdmin.from("shopify_sync_log").insert({
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

      // Update mapping timestamp
      await supabaseAdmin.from("shopify_product_mapping")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("product_id", product.id);

      await supabaseAdmin.from("shopify_sync_log").insert({
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
      await supabaseAdmin.from("shopify_sync_log").insert({
        product_id: product.id,
        sync_type: "error",
        sync_direction: "push",
        status: "error",
        error_message: productError.message?.substring(0, 500),
      });
    }
  }

  const duration = Date.now() - startTime;

  await supabaseAdmin.from("agent_logs").insert({
    agent_name: "sync-shopify",
    action: "sync_products",
    status: errors === 0 ? "success" : "partial",
    duration_ms: duration,
    output_data: { created, updated, errors, total: products.length, collections: collectionStats },
  });

  return {
    message: "Sync completed",
    created,
    updated,
    errors,
    total: products.length,
    collections: collectionStats,
    duration_ms: duration,
  };
}));
