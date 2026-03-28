/**
 * Shared Shopify configuration loader.
 * Reads from shopify_config table first, falls back to environment variables.
 */

export const SHOPIFY_API_VERSION = "2025-01";

export interface ShopifyConfig {
  shop_domain: string;
  access_token: string;
  location_id: string | null;
  pos_location_id: string | null;
  pos_active: boolean;
  sync_collections: boolean;
  sync_metafields: boolean;
}

/** Load Shopify config from DB or env vars */
export async function getShopifyConfig(supabase: any): Promise<ShopifyConfig> {
  const { data: config } = await supabase
    .from("shopify_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  return {
    shop_domain: config?.shop_domain || Deno.env.get("SHOPIFY_SHOP_DOMAIN") || "",
    access_token: Deno.env.get("SHOPIFY_ACCESS_TOKEN") || "",
    location_id: config?.location_id || Deno.env.get("SHOPIFY_LOCATION_ID") || null,
    pos_location_id: config?.pos_location_id || Deno.env.get("SHOPIFY_POS_LOCATION_ID") || null,
    pos_active: config?.pos_active ?? false,
    sync_collections: config?.sync_collections ?? true,
    sync_metafields: config?.sync_metafields ?? true,
  };
}

/** Make an authenticated Shopify Admin API request with rate limit awareness */
export async function shopifyFetch(
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

  // Respect Shopify rate limits (bucket leaky, 2 req/sec for REST)
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
