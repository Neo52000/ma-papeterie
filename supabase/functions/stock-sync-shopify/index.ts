import { createHandler } from "../_shared/handler.ts";
import { getShopifyConfig, shopifyFetch } from "../_shared/shopify-config.ts";
import { upsertStoreStock } from "../_shared/store-stock.ts";

/**
 * Stock Sync Shopify ↔ Supabase (orchestrateur bidirectionnel)
 *
 * Pull : Shopify → products.stock_quantity + product_stock_locations
 * Push : Supabase → Shopify inventory levels (via REST)
 *
 * Pour chaque delta ≠ 0, enregistre un stock_movement (type 'sync').
 * Rafraîchit stock_alerts en fin de sync.
 *
 * Paramètres :
 * - direction : 'pull' | 'push' | 'both' (défaut: 'pull')
 * - product_ids : UUID[] (optionnel, sinon tous les produits mappés)
 */

const BATCH = 50;

Deno.serve(createHandler({
  name: "stock-sync-shopify",
  auth: "admin-or-secret",
  rateLimit: { prefix: "stock-sync-shopify", max: 3, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const {
    direction = "pull",
    product_ids: productIds,
  } = (body as Record<string, any>) || {};

  const config = await getShopifyConfig(supabaseAdmin);
  if (!config.access_token) {
    return { error: "SHOPIFY_ACCESS_TOKEN not configured", status: 500 };
  }

  const targetLocationId = config.pos_location_id || config.location_id;

  // Load product ↔ Shopify mappings
  let mappingQuery = supabaseAdmin
    .from("shopify_product_mapping")
    .select("product_id, shopify_product_id, shopify_inventory_item_id");

  if (productIds?.length) {
    mappingQuery = mappingQuery.in("product_id", productIds);
  }

  const { data: mappings } = await mappingQuery;
  if (!mappings?.length) {
    return { message: "No synced products", updated: 0 };
  }

  // Load current stock for all mapped products
  const productIdsAll = mappings.map((m: any) => m.product_id);
  const { data: currentProducts } = await supabaseAdmin
    .from("products")
    .select("id, stock_quantity, shopify_variant_id")
    .in("id", productIdsAll);

  const stockMap = new Map<string, number>();
  for (const p of currentProducts || []) {
    stockMap.set(p.id, p.stock_quantity ?? 0);
  }

  let pulled = 0, pushed = 0, movements = 0, errors = 0;

  // ── PULL : Shopify → Supabase ──────────────────────────────────────────
  if (direction === "pull" || direction === "both") {
    for (let i = 0; i < mappings.length; i += BATCH) {
      const batch = mappings.slice(i, i + BATCH);

      for (const mapping of batch) {
        try {
          let inventoryItemId = mapping.shopify_inventory_item_id;

          if (!inventoryItemId) {
            const productData = await shopifyFetch(
              config,
              `/products/${mapping.shopify_product_id}.json?fields=id,variants`,
            );
            const variant = productData.product?.variants?.[0];
            if (!variant?.inventory_item_id) continue;

            inventoryItemId = String(variant.inventory_item_id);
            await supabaseAdmin.from("shopify_product_mapping")
              .update({ shopify_inventory_item_id: inventoryItemId })
              .eq("product_id", mapping.product_id);
          }

          // Fetch Shopify stock
          let shopifyStock = 0;
          if (targetLocationId && inventoryItemId) {
            try {
              const invData = await shopifyFetch(
                config,
                `/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${targetLocationId}`,
              );
              shopifyStock = invData.inventory_levels?.[0]?.available ?? 0;
            } catch {
              const pd = await shopifyFetch(
                config,
                `/products/${mapping.shopify_product_id}.json?fields=variants`,
              );
              shopifyStock = pd.product?.variants?.[0]?.inventory_quantity ?? 0;
            }
          } else {
            const pd = await shopifyFetch(
              config,
              `/products/${mapping.shopify_product_id}.json?fields=variants`,
            );
            shopifyStock = pd.product?.variants?.[0]?.inventory_quantity ?? 0;
          }

          const currentStock = stockMap.get(mapping.product_id) ?? 0;
          const delta = shopifyStock - currentStock;

          // Update products.stock_quantity
          await supabaseAdmin
            .from("products")
            .update({ stock_quantity: Math.max(0, shopifyStock) })
            .eq("id", mapping.product_id);

          // Update store stock location
          await upsertStoreStock(supabaseAdmin, mapping.product_id, shopifyStock);

          // Log movement if delta
          if (delta !== 0) {
            await supabaseAdmin.from("stock_movements").insert({
              product_id: mapping.product_id,
              movement_type: "sync",
              quantity_delta: delta,
              stock_before: currentStock,
              stock_after: Math.max(0, shopifyStock),
              source: "shopify-pull",
            });
            movements++;
          }

          pulled++;
        } catch (e: any) {
          errors++;
          console.error(`Pull error ${mapping.shopify_product_id}: ${e.message}`);
        }
      }
    }
  }

  // ── PUSH : Supabase → Shopify ──────────────────────────────────────────
  if (direction === "push" || direction === "both") {
    for (let i = 0; i < mappings.length; i += BATCH) {
      const batch = mappings.slice(i, i + BATCH);

      for (const mapping of batch) {
        try {
          const inventoryItemId = mapping.shopify_inventory_item_id;
          if (!inventoryItemId || !targetLocationId) continue;

          const supabaseStock = stockMap.get(mapping.product_id) ?? 0;

          await shopifyFetch(
            config,
            `/inventory_levels/set.json`,
            "POST",
            {
              location_id: targetLocationId,
              inventory_item_id: inventoryItemId,
              available: supabaseStock,
            },
          );

          pushed++;
        } catch (e: any) {
          errors++;
          console.error(`Push error ${mapping.shopify_product_id}: ${e.message}`);
        }
      }
    }
  }

  // Refresh materialized view
  try {
    await supabaseAdmin.rpc("refresh_stock_alerts");
  } catch (e: any) {
    console.error("Failed to refresh stock_alerts:", e.message);
  }

  // Log sync
  await supabaseAdmin.from("shopify_sync_log").insert({
    sync_type: `stock_sync_${direction}`,
    operation: "inventory_update",
    direction: direction === "pull" ? "shopify_to_supabase"
      : direction === "push" ? "supabase_to_shopify"
      : "internal",
    status: errors === 0 ? "success" : "partial",
    items_affected: pulled + pushed,
    details: { pulled, pushed, movements, errors, total: mappings.length },
  });

  return {
    message: `Stock sync (${direction}) completed`,
    pulled,
    pushed,
    movements,
    errors,
    total: mappings.length,
  };
}));
