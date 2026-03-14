import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, requireApiSecret, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

const SHOPIFY_API_VERSION = "2025-01";

interface ShopifyConfig {
  shop_domain: string;
  access_token: string;
  location_id: string | null;
}

async function getShopifyConfig(supabase: any): Promise<ShopifyConfig> {
  const { data: config } = await supabase
    .from("shopify_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  return {
    shop_domain: config?.shop_domain || Deno.env.get("SHOPIFY_SHOP_DOMAIN") || "",
    access_token: Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "",
    location_id: config?.location_id || Deno.env.get("SHOPIFY_LOCATION_ID") || null,
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

  // Respect Shopify rate limits
  const callLimit = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
  if (callLimit) {
    const [used, max] = callLimit.split("/").map(Number);
    if (used >= max - 2) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error ${response.status}: ${text}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'push-shopify-inventory');
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Auth: admin JWT or API secret (for cron)
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) {
    const secretError = requireApiSecret(req, corsHeaders);
    if (secretError) return authResult.error;
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const config = await getShopifyConfig(supabase);
    if (!config.access_token) {
      return new Response(JSON.stringify({ error: 'SHOPIFY_ACCESS_TOKEN non configuré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const productIds: string[] | undefined = body.product_ids;

    // Get products that need stock sync
    // Either specific product_ids or products with stock changed since last sync
    let query = supabase
      .from('shopify_sync_log')
      .select('product_id, shopify_product_id, shopify_variant_id')
      .eq('status', 'success')
      .eq('sync_direction', 'push')
      .not('shopify_product_id', 'is', null);

    if (productIds && productIds.length > 0) {
      query = query.in('product_id', productIds);
    }

    const { data: syncRecords } = await query;
    if (!syncRecords || syncRecords.length === 0) {
      return new Response(JSON.stringify({ message: 'Aucun produit synchronisé trouvé', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Deduplicate by product_id (keep last sync record)
    const productShopifyMap = new Map<string, { shopify_product_id: string; shopify_variant_id?: string }>();
    for (const rec of syncRecords) {
      if (rec.product_id && rec.shopify_product_id) {
        productShopifyMap.set(rec.product_id, {
          shopify_product_id: rec.shopify_product_id,
          shopify_variant_id: rec.shopify_variant_id || undefined,
        });
      }
    }

    // Get current local stock for these products
    const pids = [...productShopifyMap.keys()];
    const { data: products } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .in('id', pids);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ message: 'Aucun produit trouvé', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let updated = 0;
    let errors = 0;
    const details: string[] = [];

    for (const product of products) {
      const shopifyInfo = productShopifyMap.get(product.id);
      if (!shopifyInfo) continue;

      try {
        // Get Shopify variant to find inventory_item_id
        const shopifyProduct = await shopifyFetch(
          config,
          `/products/${shopifyInfo.shopify_product_id}.json?fields=variants`
        );

        const variant = shopifyProduct?.product?.variants?.[0];
        if (!variant?.inventory_item_id) {
          if (details.length < 20) details.push(`${product.id}: pas de variant Shopify`);
          continue;
        }

        // Set inventory level
        const locationId = config.location_id;
        if (!locationId) {
          // Get first location
          const locations = await shopifyFetch(config, '/locations.json');
          if (!locations?.locations?.[0]?.id) {
            if (details.length < 20) details.push(`${product.id}: pas de location Shopify`);
            continue;
          }
          // Use first location
          const locId = String(locations.locations[0].id);
          await shopifyFetch(config, '/inventory_levels/set.json', 'POST', {
            location_id: locId,
            inventory_item_id: variant.inventory_item_id,
            available: Math.max(0, product.stock_quantity || 0),
          });
        } else {
          await shopifyFetch(config, '/inventory_levels/set.json', 'POST', {
            location_id: locationId,
            inventory_item_id: variant.inventory_item_id,
            available: Math.max(0, product.stock_quantity || 0),
          });
        }

        updated++;

        // Log sync
        await supabase.from('shopify_sync_log').insert({
          product_id: product.id,
          shopify_product_id: shopifyInfo.shopify_product_id,
          sync_type: 'inventory_push',
          sync_direction: 'push',
          status: 'success',
          details: { stock: product.stock_quantity },
        });

        // Rate limit: 500ms between products
        await new Promise((r) => setTimeout(r, 500));
      } catch (e: any) {
        errors++;
        if (details.length < 20) details.push(`${product.id}: ${e.message}`);

        await supabase.from('shopify_sync_log').insert({
          product_id: product.id,
          shopify_product_id: shopifyInfo.shopify_product_id,
          sync_type: 'inventory_push',
          sync_direction: 'push',
          status: 'error',
          details: { error: e.message },
        });
      }
    }

    return new Response(JSON.stringify({
      updated,
      errors,
      total: products.length,
      details,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
