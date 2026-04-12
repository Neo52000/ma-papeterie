/**
 * pull-shopify-products — Fetch products FROM Shopify and sync to Supabase.
 *
 * Supabase is source of truth. Shopify prices are NEVER written to
 * products.price_ht/price_ttc (margin rule protection).
 *
 * Modes:
 *   - incremental: fetch products updated since last pull (or `since` param)
 *   - full: fetch all Shopify products
 *
 * Body: { mode: "incremental" | "full", since?: ISO string, dry_run?: boolean }
 */

import { createHandler } from "../_shared/handler.ts";
import { getShopifyConfig, shopifyFetch } from "../_shared/shopify-config.ts";
import { detectConflict } from "../_shared/shopify-conflict.ts";

const BATCH_SIZE = 250;

interface PullBody {
  mode: "incremental" | "full";
  since?: string;
  dry_run?: boolean;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  tags: string;
  updated_at: string;
  created_at: string;
  handle: string;
  status: string;
  images: Array<{ id: number; src: string; alt: string | null }>;
  variants: Array<{
    id: number;
    barcode: string | null;
    sku: string | null;
    price: string;
    inventory_item_id: number;
    inventory_quantity: number;
  }>;
}

Deno.serve(createHandler({
  name: "pull-shopify-products",
  auth: "admin-or-secret",
  rateLimit: { prefix: "pull-shopify-prods", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { mode = "incremental", since, dry_run = false } = (body || {}) as PullBody;
  const startTime = Date.now();

  const config = await getShopifyConfig(supabaseAdmin);
  if (!config.shop_domain || !config.access_token) {
    return new Response(JSON.stringify({ error: "Shopify not configured" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Determine the "since" cutoff for incremental mode
  let updatedMin: string | null = null;
  if (mode === "incremental") {
    if (since) {
      updatedMin = since;
    } else {
      // Use last pull timestamp from config
      const { data: latestMapping } = await supabaseAdmin
        .from("shopify_product_mapping")
        .select("last_pull_at")
        .not("last_pull_at", "is", null)
        .order("last_pull_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      updatedMin = latestMapping?.last_pull_at || null;
    }
  }

  // ── Fetch products from Shopify (paginated) ──
  const shopifyProducts: ShopifyProduct[] = [];
  let pageUrl = `/products.json?limit=${BATCH_SIZE}`;
  if (updatedMin) {
    pageUrl += `&updated_at_min=${encodeURIComponent(updatedMin)}`;
  }

  let pageCount = 0;
  while (pageUrl && pageCount < 50) { // Safety: max 50 pages (12,500 products)
    const result = await shopifyFetch(config, pageUrl);
    const products = result.products || [];
    shopifyProducts.push(...products);
    pageCount++;

    // Shopify REST pagination via Link header is handled by since_id
    if (products.length === BATCH_SIZE) {
      const lastId = products[products.length - 1].id;
      pageUrl = `/products.json?limit=${BATCH_SIZE}&since_id=${lastId}`;
      if (updatedMin) {
        pageUrl += `&updated_at_min=${encodeURIComponent(updatedMin)}`;
      }
    } else {
      break;
    }
  }

  if (shopifyProducts.length === 0) {
    return { success: true, message: "No products to pull", stats: { total: 0 } };
  }

  // ── Load existing mappings ──
  const shopifyIds = shopifyProducts.map(p => String(p.id));
  const { data: existingMappings } = await supabaseAdmin
    .from("shopify_product_mapping")
    .select("product_id, shopify_product_id, shopify_updated_at, supabase_updated_at, last_synced_at")
    .in("shopify_product_id", shopifyIds);

  const mappingByShopifyId = new Map(
    (existingMappings || []).map((m: any) => [m.shopify_product_id, m])
  );

  // ── Load Supabase products for existing mappings ──
  const internalProductIds = (existingMappings || []).map((m: any) => m.product_id).filter(Boolean);
  const { data: supabaseProducts } = internalProductIds.length > 0
    ? await supabaseAdmin
        .from("products")
        .select("id, ean, updated_at")
        .in("id", internalProductIds)
    : { data: [] };

  const supabaseProductById = new Map(
    (supabaseProducts || []).map((p: any) => [p.id, p])
  );

  // ── Process each Shopify product ──
  const stats = {
    total: shopifyProducts.length,
    mapped_updated: 0,
    new_matched_ean: 0,
    new_created_inactive: 0,
    conflicts: 0,
    skipped: 0,
    errors: 0,
  };
  const details: Array<{ shopify_id: string; action: string; product_id?: string }> = [];

  for (const sp of shopifyProducts) {
    const shopifyId = String(sp.id);
    const barcode = sp.variants?.[0]?.barcode || null;

    try {
      const existingMapping = mappingByShopifyId.get(shopifyId);

      if (existingMapping) {
        // ── Product already mapped: detect conflicts ──
        const supabaseProduct = supabaseProductById.get(existingMapping.product_id);
        if (!supabaseProduct) {
          stats.skipped++;
          continue;
        }

        const conflict = detectConflict(
          existingMapping,
          sp.updated_at,
          supabaseProduct.updated_at,
        );

        if (!dry_run) {
          await supabaseAdmin.from("shopify_product_mapping")
            .update({
              shopify_updated_at: sp.updated_at,
              supabase_updated_at: supabaseProduct.updated_at,
              shopify_product_data: sp,
              conflict_status: conflict.status,
              last_pull_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
              stale: false,
            })
            .eq("shopify_product_id", shopifyId);
        }

        if (conflict.status === "conflict") {
          stats.conflicts++;
        }
        stats.mapped_updated++;
        details.push({ shopify_id: shopifyId, action: `updated (${conflict.status})`, product_id: existingMapping.product_id });

      } else {
        // ── No mapping: try EAN match, or create inactive product ──
        let matchedProductId: string | null = null;

        // Try matching by EAN/barcode
        if (barcode && barcode.length >= 8) {
          const { data: eanMatch } = await supabaseAdmin
            .from("products")
            .select("id")
            .eq("ean", barcode)
            .limit(1)
            .maybeSingle();
          if (eanMatch) {
            matchedProductId = eanMatch.id;
          }
        }

        if (matchedProductId) {
          // EAN match found — create mapping only
          if (!dry_run) {
            await supabaseAdmin.from("shopify_product_mapping").upsert({
              product_id: matchedProductId,
              shopify_product_id: shopifyId,
              shopify_variant_id: sp.variants?.[0]?.id ? String(sp.variants[0].id) : null,
              shopify_inventory_item_id: sp.variants?.[0]?.inventory_item_id
                ? String(sp.variants[0].inventory_item_id) : null,
              shopify_updated_at: sp.updated_at,
              shopify_product_data: sp,
              sync_direction: "pull",
              last_pull_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
              conflict_status: "none",
            }, { onConflict: "product_id" });
          }
          stats.new_matched_ean++;
          details.push({ shopify_id: shopifyId, action: "matched_ean", product_id: matchedProductId });

        } else {
          // No match — create inactive product for admin review
          if (!dry_run) {
            const newProduct = {
              name: sp.title,
              description: sp.body_html || null,
              category: sp.product_type || "Non classé",
              brand: sp.vendor || "Ma Papeterie",
              ean: barcode || null,
              price: parseFloat(sp.variants?.[0]?.price || "0"),
              price_ttc: parseFloat(sp.variants?.[0]?.price || "0"),
              stock_quantity: sp.variants?.[0]?.inventory_quantity ?? 0,
              image_url: sp.images?.[0]?.src || null,
              is_active: false, // Needs admin review
              is_available: false,
            };

            const { data: created, error: createError } = await supabaseAdmin
              .from("products")
              .insert(newProduct)
              .select("id")
              .single();

            if (created && !createError) {
              await supabaseAdmin.from("shopify_product_mapping").upsert({
                product_id: created.id,
                shopify_product_id: shopifyId,
                shopify_variant_id: sp.variants?.[0]?.id ? String(sp.variants[0].id) : null,
                shopify_inventory_item_id: sp.variants?.[0]?.inventory_item_id
                  ? String(sp.variants[0].inventory_item_id) : null,
                shopify_updated_at: sp.updated_at,
                shopify_product_data: sp,
                sync_direction: "pull",
                last_pull_at: new Date().toISOString(),
                last_synced_at: new Date().toISOString(),
                conflict_status: "none",
              }, { onConflict: "shopify_product_id" });

              details.push({ shopify_id: shopifyId, action: "created_inactive", product_id: created.id });
            } else {
              console.error(`[pull-shopify-products] Failed to create product for Shopify #${shopifyId}:`, createError);
              stats.errors++;
              continue;
            }
          } else {
            details.push({ shopify_id: shopifyId, action: "would_create_inactive" });
          }
          stats.new_created_inactive++;
        }
      }
    } catch (err) {
      console.error(`[pull-shopify-products] Error processing Shopify product ${shopifyId}:`, err);
      stats.errors++;
    }
  }

  const durationMs = Date.now() - startTime;

  // ── Log to shopify_sync_log ──
  if (!dry_run) {
    await supabaseAdmin.from("shopify_sync_log").insert({
      sync_type: "product_pull",
      sync_direction: "pull",
      operation: "product_pull",
      status: stats.errors === 0 ? "success" : "partial",
      items_affected: stats.total,
      duration_ms: durationMs,
      triggered_by: "manual",
      details: { mode, dry_run, stats },
    });

    await supabaseAdmin.from("agent_logs").insert({
      agent_name: "pull-shopify-products",
      action: "pull_products",
      status: stats.errors === 0 ? "success" : "partial",
      duration_ms: durationMs,
      output_data: stats,
    });
  }

  return {
    success: true,
    dry_run,
    mode,
    stats,
    details: details.slice(0, 100), // Limit response size
    duration_ms: durationMs,
  };
}));
