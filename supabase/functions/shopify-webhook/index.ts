import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { decrementStoreStock, upsertStoreStock } from "../_shared/store-stock.ts";

/**
 * Shopify Webhook Handler
 *
 * Reçoit les webhooks Shopify pour :
 * - orders/create : Nouvelle commande (en ligne ou POS)
 * - orders/updated : Mise à jour commande
 * - inventory_levels/update : Changement de stock (vente POS, ajustement)
 *
 * Logique de stock :
 * - Commandes POS → décrémente product_stock_locations (stock magasin)
 * - Commandes Web → décrémente products.stock_quantity (stock agrégé)
 * - inventory_levels/update → met à jour le stock magasin si location = POS
 *
 * Sécurité : vérification HMAC SHA-256 de la signature Shopify.
 */

async function verifyShopifyHmac(
  body: string,
  hmacHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!hmacHeader || !secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));

  // Comparaison constante
  if (computed.length !== hmacHeader.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(createHandler({
  name: "shopify-webhook",
  auth: "none",
  rawBody: true,
}, async ({ supabaseAdmin, req, corsHeaders }) => {
  const rawBody = await req.text();

  // Vérifier la signature HMAC
  const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256");
  const { data: shopifyConfig } = await supabaseAdmin
    .from("shopify_config")
    .select("webhook_secret, pos_location_id")
    .limit(1)
    .maybeSingle();

  const webhookSecret = shopifyConfig?.webhook_secret || Deno.env.get("SHOPIFY_WEBHOOK_SECRET") || "";
  const posLocationId = shopifyConfig?.pos_location_id || Deno.env.get("SHOPIFY_POS_LOCATION_ID") || null;

  if (webhookSecret) {
    const valid = await verifyShopifyHmac(rawBody, hmacHeader, webhookSecret);
    if (!valid) {
      return jsonResponse(
        { error: "Invalid HMAC signature" },
        401,
        corsHeaders,
      );
    }
  }

  const topic = req.headers.get("X-Shopify-Topic") || "";
  const shopDomain = req.headers.get("X-Shopify-Shop-Domain") || "";

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(
      { error: "Invalid JSON" },
      400,
      corsHeaders,
    );
  }

  switch (topic) {
    // ── Nouvelle commande ou mise à jour ──
    case "orders/create":
    case "orders/updated": {
      const sourceName = payload.source_name || "web"; // "pos", "web", "shopify_draft_order"
      const isPOS = sourceName === "pos";

      // Mapper les line_items vers les product_ids internes
      const lineItems = payload.line_items || [];
      const shopifyProductIds = lineItems
        .map((li: any) => String(li.product_id))
        .filter(Boolean);

      // Trouver les product_ids internes via shopify_product_mapping
      const { data: productMappings } = await supabaseAdmin
        .from("shopify_product_mapping")
        .select("product_id, shopify_product_id")
        .in("shopify_product_id", shopifyProductIds);

      const shopifyToInternal = new Map<string, string>();
      productMappings?.forEach((m: any) => {
        if (!shopifyToInternal.has(m.shopify_product_id)) {
          shopifyToInternal.set(m.shopify_product_id, m.product_id);
        }
      });

      // Fallback: sync_log pour les produits non trouvés dans le mapping
      const unmappedShopifyIds = shopifyProductIds.filter(
        (sid: string) => !shopifyToInternal.has(sid)
      );
      if (unmappedShopifyIds.length > 0) {
        const { data: syncMappings } = await supabaseAdmin
          .from("shopify_sync_log")
          .select("product_id, shopify_product_id")
          .in("shopify_product_id", unmappedShopifyIds)
          .eq("status", "success");

        syncMappings?.forEach((m: any) => {
          if (!shopifyToInternal.has(m.shopify_product_id)) {
            shopifyToInternal.set(m.shopify_product_id, m.product_id);
          }
        });
      }

      // Check if this order already exists (avoid double stock decrement)
      const { data: existingOrder } = await supabaseAdmin
        .from("shopify_orders")
        .select("shopify_order_id")
        .eq("shopify_order_id", String(payload.id))
        .maybeSingle();

      const isNewOrder = !existingOrder;

      const mappedLineItems = lineItems.map((li: any) => ({
        shopify_product_id: String(li.product_id),
        internal_product_id: shopifyToInternal.get(String(li.product_id)) || null,
        title: li.title,
        quantity: li.quantity,
        price: li.price,
        sku: li.sku,
      }));

      // Insérer/mettre à jour dans shopify_orders
      const orderData = {
        shopify_order_id: String(payload.id),
        order_number: payload.name || payload.order_number,
        source_name: sourceName,
        financial_status: payload.financial_status,
        fulfillment_status: payload.fulfillment_status,
        total_price: parseFloat(payload.total_price) || 0,
        subtotal_price: parseFloat(payload.subtotal_price) || 0,
        total_tax: parseFloat(payload.total_tax) || 0,
        currency: payload.currency || "EUR",
        customer_email: payload.email || payload.customer?.email || null,
        customer_name: payload.customer
          ? `${payload.customer.first_name || ""} ${payload.customer.last_name || ""}`.trim()
          : null,
        line_items: mappedLineItems,
        pos_location_id: isPOS ? String(payload.location_id || "") : null,
        shopify_created_at: payload.created_at,
        synced_at: new Date().toISOString(),
      };

      await supabaseAdmin.from("shopify_orders").upsert(orderData, {
        onConflict: "shopify_order_id",
      });

      // Only decrement stock for NEW orders to avoid double counting
      if (isNewOrder && (payload.financial_status === "paid" || isPOS)) {
        // Batch: collect all product IDs and quantities
        const stockUpdates = new Map<string, number>();
        for (const li of lineItems) {
          const internalId = shopifyToInternal.get(String(li.product_id));
          if (internalId && li.quantity > 0) {
            const current = stockUpdates.get(internalId) || 0;
            stockUpdates.set(internalId, current + li.quantity);
          }
        }

        if (stockUpdates.size > 0) {
          if (isPOS) {
            // ── POS : décrémenter le stock MAGASIN (product_stock_locations) ──
            for (const [productId, decrement] of stockUpdates) {
              await decrementStoreStock(supabaseAdmin, productId, decrement);
            }
          } else {
            // ── Web : décrémenter le stock agrégé (products.stock_quantity) ──
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
      }

      // Log
      await supabaseAdmin.from("shopify_sync_log").insert({
        sync_type: topic === "orders/create" ? "order_create" : "order_update",
        sync_direction: "pull",
        status: "success",
        details: {
          order_id: payload.id,
          order_number: payload.name,
          source: sourceName,
          total: payload.total_price,
          items_count: lineItems.length,
          stock_target: isPOS ? "store_stock" : "products.stock_quantity",
        },
      });

      break;
    }

    // ── Mise à jour niveau de stock ──
    case "inventory_levels/update": {
      const inventoryItemId = String(payload.inventory_item_id);
      const available = payload.available ?? 0;
      const locationId = String(payload.location_id || "");

      // Vérifier si c'est la location POS
      const isPosLocation = posLocationId && locationId === posLocationId;

      // Trouver le produit interne via shopify_product_mapping (lookup direct par inventory_item_id)
      let internalProductId: string | null = null;

      const { data: mapping } = await supabaseAdmin
        .from("shopify_product_mapping")
        .select("product_id")
        .eq("shopify_inventory_item_id", inventoryItemId)
        .limit(1)
        .maybeSingle();

      if (mapping?.product_id) {
        internalProductId = mapping.product_id;
      } else {
        // Fallback: chercher dans les sync_logs
        const { data: cached } = await supabaseAdmin
          .from("shopify_sync_log")
          .select("product_id")
          .eq("sync_type", "inventory_update")
          .eq("status", "success")
          .contains("details", { inventory_item_id: inventoryItemId })
          .not("product_id", "is", null)
          .limit(1)
          .maybeSingle();

        if (cached?.product_id) {
          internalProductId = cached.product_id;
        }
      }

      if (internalProductId) {
        if (isPosLocation) {
          // ── Location POS → mettre à jour le stock MAGASIN ──
          await upsertStoreStock(supabaseAdmin, internalProductId, Math.max(0, available));
        } else {
          // ── Autre location → mettre à jour le stock agrégé ──
          const newStock = Math.max(0, available);
          await supabaseAdmin
            .from("products")
            .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
            .eq("id", internalProductId);
        }
      }

      await supabaseAdmin.from("shopify_sync_log").insert({
        product_id: internalProductId,
        sync_type: "inventory_update",
        sync_direction: "pull",
        status: internalProductId ? "success" : "pending",
        details: {
          inventory_item_id: inventoryItemId,
          available,
          location_id: locationId,
          is_pos_location: isPosLocation,
          stock_target: isPosLocation ? "store_stock" : "products.stock_quantity",
          product_found: !!internalProductId,
        },
      });

      break;
    }

    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  return { ok: true, topic };
}));
