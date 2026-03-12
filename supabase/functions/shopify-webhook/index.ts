import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

/**
 * Shopify Webhook Handler
 *
 * Reçoit les webhooks Shopify pour :
 * - orders/create : Nouvelle commande (en ligne ou POS)
 * - orders/updated : Mise à jour commande
 * - inventory_levels/update : Changement de stock (vente POS, ajustement)
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

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const rawBody = await req.text();

  // Vérifier la signature HMAC
  const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256");
  const { data: shopifyConfig } = await supabase
    .from("shopify_config")
    .select("webhook_secret")
    .limit(1)
    .maybeSingle();

  const webhookSecret = shopifyConfig?.webhook_secret || Deno.env.get("SHOPIFY_WEBHOOK_SECRET") || "";

  if (webhookSecret) {
    const valid = await verifyShopifyHmac(rawBody, hmacHeader, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid HMAC signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const topic = req.headers.get("X-Shopify-Topic") || "";
  const shopDomain = req.headers.get("X-Shopify-Shop-Domain") || "";

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
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

        // Trouver les product_ids internes via shopify_sync_log
        const { data: syncMappings } = await supabase
          .from("shopify_sync_log")
          .select("product_id, shopify_product_id")
          .in("shopify_product_id", shopifyProductIds)
          .eq("status", "success");

        const shopifyToInternal = new Map<string, string>();
        syncMappings?.forEach((m: any) => {
          if (!shopifyToInternal.has(m.shopify_product_id)) {
            shopifyToInternal.set(m.shopify_product_id, m.product_id);
          }
        });

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
          line_items: lineItems.map((li: any) => ({
            shopify_product_id: String(li.product_id),
            internal_product_id: shopifyToInternal.get(String(li.product_id)) || null,
            title: li.title,
            quantity: li.quantity,
            price: li.price,
            sku: li.sku,
          })),
          pos_location_id: isPOS ? String(payload.location_id || "") : null,
          shopify_created_at: payload.created_at,
          synced_at: new Date().toISOString(),
        };

        await supabase.from("shopify_orders").upsert(orderData, {
          onConflict: "shopify_order_id",
        });

        // Décrémenter les stocks pour les commandes confirmées
        if (payload.financial_status === "paid" || isPOS) {
          for (const li of lineItems) {
            const internalId = shopifyToInternal.get(String(li.product_id));
            if (internalId && li.quantity > 0) {
              // Décrémenter stock (éviter les négatifs)
              const { data: currentProduct } = await supabase
                .from("products")
                .select("stock_quantity")
                .eq("id", internalId)
                .single();

              if (currentProduct) {
                const newStock = Math.max(0, (currentProduct.stock_quantity || 0) - li.quantity);
                await supabase
                  .from("products")
                  .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
                  .eq("id", internalId);
              }
            }
          }
        }

        // Log
        await supabase.from("shopify_sync_log").insert({
          sync_type: topic === "orders/create" ? "order_create" : "order_update",
          sync_direction: "pull",
          status: "success",
          details: {
            order_id: payload.id,
            order_number: payload.name,
            source: sourceName,
            total: payload.total_price,
            items_count: lineItems.length,
          },
        });

        break;
      }

      // ── Mise à jour niveau de stock ──
      case "inventory_levels/update": {
        const inventoryItemId = String(payload.inventory_item_id);
        const available = payload.available ?? 0;
        const locationId = String(payload.location_id || "");

        // Trouver le produit interne via le variant Shopify
        // D'abord chercher le variant par inventory_item_id
        // Note: cela nécessite un mapping inventory_item_id → product_id
        // Pour le moment, on log et on traite via pull-shopify-inventory
        await supabase.from("shopify_sync_log").insert({
          sync_type: "inventory_update",
          sync_direction: "pull",
          status: "success",
          details: {
            inventory_item_id: inventoryItemId,
            available,
            location_id: locationId,
          },
        });

        break;
      }

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return new Response(JSON.stringify({ ok: true, topic }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(`Webhook error (${topic}):`, error.message);

    await supabase.from("shopify_sync_log").insert({
      sync_type: `webhook_${topic}`,
      sync_direction: "pull",
      status: "error",
      error_message: error.message?.substring(0, 500),
    });

    return new Response(JSON.stringify({ error: "Webhook processing error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
