import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, requireApiSecret, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

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

const SHOPIFY_API_VERSION = "2025-01";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "pull-shopify-orders");
  if (!(await checkRateLimit(rlKey, 5, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Auth: admin JWT ou API secret (cron)
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) {
    const secretError = requireApiSecret(req, corsHeaders);
    if (secretError) return authResult.error;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 50, 250);
    const sourceFilter = body.source_filter || "all";

    // Récupérer la config Shopify
    const { data: shopifyConfig } = await supabase
      .from("shopify_config")
      .select("shop_domain, last_full_sync_at")
      .limit(1)
      .maybeSingle();

    const shopDomain = shopifyConfig?.shop_domain || Deno.env.get("SHOPIFY_SHOP_DOMAIN") || "";
    const accessToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Déterminer la date de début
    const since = body.since || shopifyConfig?.last_full_sync_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Construire l'URL
    let url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=${limit}&created_at_min=${since}&order=created_at+asc`;

    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const orders = data.orders || [];

    // Charger les mappings Shopify → interne
    const allShopifyProductIds = new Set<string>();
    for (const order of orders) {
      for (const li of order.line_items || []) {
        if (li.product_id) allShopifyProductIds.add(String(li.product_id));
      }
    }

    const { data: syncMappings } = await supabase
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
    const { data: existingOrders } = await supabase
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

        await supabase.from("shopify_orders").upsert(
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
            const { data: products } = await supabase
              .from("products")
              .select("id, stock_quantity")
              .in("id", productIds);

            for (const prod of products || []) {
              const decrement = stockUpdates.get(prod.id) || 0;
              const newStock = Math.max(0, (prod.stock_quantity || 0) - decrement);
              await supabase
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
      await supabase
        .from("shopify_config")
        .update({ last_full_sync_at: lastOrderDate, updated_at: new Date().toISOString() })
        .eq("shop_domain", shopDomain);
    }

    // Log
    await supabase.from("shopify_sync_log").insert({
      sync_type: "pull_orders",
      sync_direction: "pull",
      status: errors === 0 ? "success" : "partial",
      details: { imported, skipped, errors, total: orders.length, source_filter: sourceFilter },
    });

    return new Response(
      JSON.stringify({
        message: "Orders pull completed",
        imported,
        skipped,
        errors,
        total: orders.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Erreur lors du pull des commandes Shopify" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
