import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { getShopifyConfig, shopifyFetch } from "../_shared/shopify-config.ts";
import { getStoreStock } from "../_shared/store-stock.ts";

/**
 * Push Shopify Inventory (POS)
 *
 * Pousse uniquement le stock MAGASIN (product_stock_locations WHERE location_type = 'store')
 * vers Shopify POS. Le stock agrégé (products.stock_quantity) n'est PAS utilisé.
 */

Deno.serve(createHandler({
  name: "push-shopify-inventory",
  auth: "admin-or-secret",
  rateLimit: { prefix: "push-shopify-inventory", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const config = await getShopifyConfig(supabaseAdmin);
  if (!config.access_token) {
    return jsonResponse(
      { error: 'SHOPIFY_ACCESS_TOKEN non configuré' },
      500,
      corsHeaders,
    );
  }

  const { product_ids: productIds } = (body as Record<string, any>) || {};

  // Récupérer les mappings produit ↔ Shopify depuis la table dédiée
  let mappingQuery = supabaseAdmin
    .from('shopify_product_mapping')
    .select('product_id, shopify_product_id, shopify_variant_id, shopify_inventory_item_id');

  if (productIds && productIds.length > 0) {
    mappingQuery = mappingQuery.in('product_id', productIds);
  }

  const { data: mappings } = await mappingQuery;
  if (!mappings || mappings.length === 0) {
    return { message: 'Aucun produit synchronisé trouvé', updated: 0 };
  }

  // Récupérer le stock MAGASIN pour ces produits
  const pids = mappings.map((m: any) => m.product_id);
  const storeStockMap = await getStoreStock(supabaseAdmin, pids);

  // Déterminer la location Shopify POS
  const posLocationId = config.pos_location_id || config.location_id;

  let updated = 0;
  let errors = 0;
  const details: string[] = [];

  for (const mapping of mappings) {
    try {
      let inventoryItemId = mapping.shopify_inventory_item_id;

      // Si pas d'inventory_item_id en cache, le récupérer via l'API Shopify
      if (!inventoryItemId) {
        const shopifyProduct = await shopifyFetch(
          config,
          `/products/${mapping.shopify_product_id}.json?fields=variants`
        );
        const variant = shopifyProduct?.product?.variants?.[0];
        if (!variant?.inventory_item_id) {
          if (details.length < 20) details.push(`${mapping.product_id}: pas de variant Shopify`);
          continue;
        }
        inventoryItemId = String(variant.inventory_item_id);

        // Mettre à jour le mapping pour les prochains appels
        await supabaseAdmin.from('shopify_product_mapping')
          .update({ shopify_inventory_item_id: inventoryItemId })
          .eq('product_id', mapping.product_id);
      }

      // Déterminer la location
      let locationId = posLocationId;
      if (!locationId) {
        const locations = await shopifyFetch(config, '/locations.json');
        if (!locations?.locations?.[0]?.id) {
          if (details.length < 20) details.push(`${mapping.product_id}: pas de location Shopify`);
          continue;
        }
        locationId = String(locations.locations[0].id);
      }

      // Stock magasin uniquement (0 si pas d'entrée store)
      const storeStock = storeStockMap.get(mapping.product_id) || 0;

      await shopifyFetch(config, '/inventory_levels/set.json', 'POST', {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: Math.max(0, storeStock),
      });

      updated++;

      // Log sync
      await supabaseAdmin.from('shopify_sync_log').insert({
        product_id: mapping.product_id,
        shopify_product_id: mapping.shopify_product_id,
        sync_type: 'inventory_push',
        sync_direction: 'push',
        status: 'success',
        details: { store_stock: storeStock, source: 'store_stock', location_id: locationId },
      });

      // Rate limit: 500ms entre chaque produit
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      errors++;
      if (details.length < 20) details.push(`${mapping.product_id}: ${e.message}`);

      await supabaseAdmin.from('shopify_sync_log').insert({
        product_id: mapping.product_id,
        shopify_product_id: mapping.shopify_product_id,
        sync_type: 'inventory_push',
        sync_direction: 'push',
        status: 'error',
        details: { error: e.message },
      });
    }
  }

  return {
    updated,
    errors,
    total: mappings.length,
    details,
  };
}));
