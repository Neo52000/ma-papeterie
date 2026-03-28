import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { getShopifyConfig, shopifyFetch } from "../_shared/shopify-config.ts";
import { upsertStoreStock } from "../_shared/store-stock.ts";

/**
 * Pull Shopify Inventory → Stock Magasin
 *
 * Récupère les niveaux d'inventaire depuis Shopify (POS location)
 * et les écrit dans product_stock_locations (location_type = 'store').
 *
 * Ne touche PAS à products.stock_quantity (stock agrégé).
 *
 * Paramètres :
 * - location_id : ID d'emplacement Shopify spécifique (optionnel, défaut: pos_location_id)
 * - product_ids : IDs internes à vérifier (optionnel, sinon tous les produits sync)
 */

Deno.serve(createHandler({
  name: "pull-shopify-inventory",
  auth: "admin-or-secret",
  rateLimit: { prefix: "pull-shopify-inventory", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { location_id: locationId, product_ids: productIds } = (body as Record<string, any>) || {};

  const config = await getShopifyConfig(supabaseAdmin);
  // Priorité : paramètre > pos_location_id > location_id générique
  const targetLocationId = locationId || config.pos_location_id || config.location_id;

  if (!config.access_token) {
    return jsonResponse(
      { error: "SHOPIFY_ACCESS_TOKEN not configured" },
      500,
      corsHeaders,
    );
  }

  // Charger les mappings produit ↔ Shopify depuis la table dédiée
  let mappingQuery = supabaseAdmin
    .from("shopify_product_mapping")
    .select("product_id, shopify_product_id, shopify_inventory_item_id");

  if (productIds?.length) {
    mappingQuery = mappingQuery.in("product_id", productIds);
  }

  const { data: mappings } = await mappingQuery;
  if (!mappings?.length) {
    return { message: "No synced products to check", updated: 0 };
  }

  let updated = 0, skipped = 0, errors = 0;

  const BATCH = 50;
  for (let i = 0; i < mappings.length; i += BATCH) {
    const batch = mappings.slice(i, i + BATCH);

    for (const mapping of batch) {
      try {
        let inventoryItemId = mapping.shopify_inventory_item_id;

        // Si pas d'inventory_item_id en cache, le récupérer via l'API
        if (!inventoryItemId) {
          let productData;
          try {
            productData = await shopifyFetch(
              config,
              `/products/${mapping.shopify_product_id}.json?fields=id,variants`,
            );
          } catch (e: any) {
            if (e.message?.includes("404")) {
              skipped++;
              continue;
            }
            throw e;
          }
          const variant = productData.product?.variants?.[0];
          if (!variant?.inventory_item_id) { skipped++; continue; }

          inventoryItemId = String(variant.inventory_item_id);

          // Mettre à jour le mapping pour les prochains appels
          await supabaseAdmin.from("shopify_product_mapping")
            .update({ shopify_inventory_item_id: inventoryItemId })
            .eq("product_id", mapping.product_id);
        }

        // Récupérer le stock Shopify pour la location POS
        let shopifyStock = 0;

        if (targetLocationId && inventoryItemId) {
          try {
            const invData = await shopifyFetch(
              config,
              `/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${targetLocationId}`,
            );
            const level = invData.inventory_levels?.[0];
            if (level) {
              shopifyStock = level.available ?? 0;
            }
          } catch {
            // Fallback : récupérer le stock global du variant
            try {
              const productData = await shopifyFetch(
                config,
                `/products/${mapping.shopify_product_id}.json?fields=variants`,
              );
              shopifyStock = productData.product?.variants?.[0]?.inventory_quantity ?? 0;
            } catch {
              // Ignorer
            }
          }
        } else {
          // Pas de location spécifique → stock global du variant
          try {
            const productData = await shopifyFetch(
              config,
              `/products/${mapping.shopify_product_id}.json?fields=variants`,
            );
            shopifyStock = productData.product?.variants?.[0]?.inventory_quantity ?? 0;
          } catch {
            skipped++;
            continue;
          }
        }

        // Écrire dans product_stock_locations (stock magasin)
        await upsertStoreStock(supabaseAdmin, mapping.product_id, shopifyStock);
        updated++;
      } catch (e: any) {
        errors++;
        console.error(`Inventory pull ${mapping.shopify_product_id}: ${e.message}`);
      }
    }
  }

  // Log
  await supabaseAdmin.from("shopify_sync_log").insert({
    sync_type: "pull_inventory",
    sync_direction: "pull",
    status: errors === 0 ? "success" : "partial",
    details: {
      updated,
      skipped,
      errors,
      total: mappings.length,
      location_id: targetLocationId || "all",
      target: "product_stock_locations.store",
    },
  });

  return {
    message: "Inventory pull completed → stock magasin",
    updated,
    skipped,
    errors,
    total: mappings.length,
  };
}));
