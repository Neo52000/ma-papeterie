import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { getShopifyConfig, shopifyFetch } from "../_shared/shopify-config.ts";

/**
 * Pull Shopify Orders
 *
 * Récupère les commandes Shopify (en ligne + POS) via l'API REST Admin.
 * Polling alternatif aux webhooks pour rattraper les commandes manquées.
 *
 * Paramètres :
 * - since : Date ISO depuis laquelle récupérer (défaut: dernière sync)
 * - source_filter : "all" | "pos" | "web" (défaut: "all")
 * - limit : Nombre max de commandes (défaut: 50, max: 250)
 */

Deno.serve(createHandler({
  name: "pull-shopify-orders",
  auth: "admin-or-secret",
  rateLimit: { prefix: "pull-shopify-orders", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { since: sinceParam, source_filter: sourceFilter = "all", limit: limitParam } = (body as Record<string, any>) || {};
  const limit = Math.min(limitParam || 50, 250);

  // Récupérer la config Shopify via le module partagé
  const config = await getShopifyConfig(supabaseAdmin);

  if (!config.access_token) {
    return jsonResponse(
      { error: "SHOPIFY_ACCESS_TOKEN not configured" },
      500,
      corsHeaders,
    );
  }

  // Déterminer la date de début (besoin de last_full_sync_at depuis la DB)
  const { data: syncConfig } = await supabaseAdmin
    .from("shopify_config")
    .select("last_full_sync_at")
    .limit(1)
    .maybeSingle();

  const since = sinceParam || syncConfig?.last_full_sync_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Récupérer les commandes via shopifyFetch
  const data = await shopifyFetch(
    config,
    `/orders.json?status=any&limit=${limit}&created_at_min=${since}&order=created_at+asc`,
  );
  const orders = data.orders || [];

  // Charger les mappings Shopify → interne
  const allShopifyProductIds = new Set<string>();
  for (const order of orders) {
    for (const li of order.line_items || []) {
      if (li.product_id) allShopifyProductIds.add(String(li.product_id));
    }
  }

  const { data: syncMappings } = await supabaseAdmin
    .from("shopify_sync_log")
    .select("product_id, shopify_product_id")
    .in("shopify_product_id", [...allShopifyProductIds])
    .eq("status", "success");

  const shopifyToInternal = new Map<string, string>();
  syncMappings?.forEach((m: any) => {
    if (!shopifyToInternal.has(m.shopify_product_id)) {
      shopifyToInternal.set(m.shopify_product_id, m.product_id);
    }
  });

  let imported = 0, skipped = 0, errors = 0;

  // Pre-fetch existing order IDs to avoid double stock decrement
  const orderShopifyIds = orders.map((o: any) => String(o.id));
  const { data: existingOrders } = await supabaseAdmin
    .from("shopify_orders")
    .select("shopify_order_id")
    .in("shopify_order_id", orderShopifyIds);
  const existingOrderIds = new Set(
    (existingOrders || []).map((o: any) => o.shopify_order_id)
  );

  for (const order of orders) {
    const sourceName = order.source_name || "web";
    const isPOS = sourceName === "pos";

    // Filtrer par source si demandé
    if (sourceFilter === "pos" && !isPOS) { skipped++; continue; }
    if (sourceFilter === "web" && isPOS) { skipped++; continue; }

    try {
      const lineItems = (order.line_items || []).map((li: any) => ({
        shopify_product_id: String(li.product_id),
        internal_product_id: shopifyToInternal.get(String(li.product_id)) || null,
        title: li.title,
        quantity: li.quantity,
        price: li.price,
        sku: li.sku,
      }));

      const isNewOrder = !existingOrderIds.has(String(order.id));

      await supabaseAdmin.from("shopify_orders").upsert(
        {
          shopify_order_id: String(order.id),
          order_number: order.name || order.order_number,
          source_name: sourceName,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          total_price: parseFloat(order.total_price) || 0,
          subtotal_price: parseFloat(order.subtotal_price) || 0,
          total_tax: parseFloat(order.total_tax) || 0,
          currency: order.currency || "EUR",
          customer_email: order.email || order.customer?.email || null,
          customer_name: order.customer
            ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
            : null,
          line_items: lineItems,
          pos_location_id: isPOS ? String(order.location_id || "") : null,
          shopify_created_at: order.created_at,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "shopify_order_id" },
      );

      // Only decrement stock for NEW orders to avoid double counting
      if (isNewOrder && (order.financial_status === "paid" || isPOS)) {
        // Batch: collect all product IDs and quantities to update
        const stockUpdates = new Map<string, number>();
        for (const li of lineItems) {
          if (li.internal_product_id && li.quantity > 0) {
            const current = stockUpdates.get(li.internal_product_id) || 0;
            stockUpdates.set(li.internal_product_id, current + li.quantity);
          }
        }

        if (stockUpdates.size > 0) {
          const productIds = [...stockUpdates.keys()];
          const { data: products } = await supabaseAdmin
            .from("products")
            .select("id, stock_quantity")
            .in("id", productIds);

          for (const prod of products || []) {
            const decrement = stockUpdates.get(prod.id) || 0;
            const newStock = Math.max(0, (prod.stock_quantity || 0) - decrement);
            await supabaseAdmin
              .from("products")
              .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
              .eq("id", prod.id);
          }
        }
      }

      imported++;
    } catch (e: any) {
      errors++;
      console.error(`Order ${order.id}: ${e.message}`);
    }
  }

  // Mettre à jour last_full_sync_at
  if (orders.length > 0) {
    const lastOrderDate = orders[orders.length - 1].created_at;
    await supabaseAdmin
      .from("shopify_config")
      .update({ last_full_sync_at: lastOrderDate, updated_at: new Date().toISOString() })
      .eq("shop_domain", config.shop_domain);
  }

  // Log
  await supabaseAdmin.from("shopify_sync_log").insert({
    sync_type: "pull_orders",
    sync_direction: "pull",
    status: errors === 0 ? "success" : "partial",
    details: { imported, skipped, errors, total: orders.length, source_filter: sourceFilter },
  });

  return {
    message: "Orders pull completed",
    imported,
    skipped,
    errors,
    total: orders.length,
  };
}));
