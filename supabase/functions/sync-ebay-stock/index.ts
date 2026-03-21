import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface EbayCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  marketplace_id: string;
}

// Get eBay OAuth access token
async function getEbayAccessToken(credentials: EbayCredentials): Promise<string> {
  const tokenUrl = "https://api.ebay.com/identity/v1/oauth2/token";
  const authString = btoa(`${credentials.client_id}:${credentials.client_secret}`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${authString}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refresh_token,
      scope: "https://api.ebay.com/oauth/api_scope/sell.inventory",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get eBay token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Update inventory on eBay using Inventory API
async function updateEbayInventory(
  accessToken: string,
  marketplaceId: string,
  updates: Array<{ sku: string; quantity: number }>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const update of updates) {
    try {
      console.log(`[eBay] Updating SKU ${update.sku} to quantity ${update.quantity}`);

      const inventoryUrl = `https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(update.sku)}`;

      const getResponse = await fetch(inventoryUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
        },
      });

      if (getResponse.ok) {
        const inventoryItem = await getResponse.json();

        inventoryItem.availability = {
          shipToLocationAvailability: {
            quantity: update.quantity,
          },
        };

        const putResponse = await fetch(inventoryUrl, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Content-Language": "fr-FR",
            "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
          },
          body: JSON.stringify(inventoryItem),
        });

        if (!putResponse.ok) {
          const errorText = await putResponse.text();
          errors.push(`Failed to update SKU ${update.sku}: ${errorText}`);
        } else {
          console.log(`[eBay] Successfully updated SKU ${update.sku}`);
        }
      } else if (getResponse.status === 404) {
        console.log(`[eBay] SKU ${update.sku} not found on eBay, skipping`);
      } else {
        const errorText = await getResponse.text();
        errors.push(`Failed to get SKU ${update.sku}: ${errorText}`);
      }

    } catch (error: any) {
      errors.push(`Error updating SKU ${update.sku}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

Deno.serve(createHandler({
  name: "sync-ebay-stock",
  auth: "admin",
  rateLimit: { prefix: "sync-ebay", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, corsHeaders }) => {
  // Get eBay credentials from environment
  const ebayClientId = Deno.env.get("EBAY_CLIENT_ID");
  const ebayClientSecret = Deno.env.get("EBAY_CLIENT_SECRET");
  const ebayRefreshToken = Deno.env.get("EBAY_REFRESH_TOKEN");
  const ebayMarketplaceId = Deno.env.get("EBAY_MARKETPLACE_ID") || "EBAY_FR";

  if (!ebayClientId || !ebayClientSecret || !ebayRefreshToken) {
    await supabaseAdmin.from("marketplace_sync_logs").insert({
      marketplace_name: "eBay",
      sync_type: "stock",
      status: "error",
      errors: { message: "eBay API credentials not configured" },
      completed_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: false,
      error: "eBay API credentials not configured",
      instructions: [
        "Configure EBAY_CLIENT_ID in Supabase secrets",
        "Configure EBAY_CLIENT_SECRET in Supabase secrets",
        "Configure EBAY_REFRESH_TOKEN in Supabase secrets",
        "Optionally set EBAY_MARKETPLACE_ID (default: EBAY_FR)",
      ],
    }, 400, corsHeaders);
  }

  // Create sync log entry
  const { data: syncLog } = await supabaseAdmin
    .from("marketplace_sync_logs")
    .insert({
      marketplace_name: "eBay",
      sync_type: "stock",
      status: "running",
    })
    .select()
    .single();

  console.log(`[eBay] Starting stock sync, log ID: ${syncLog?.id}`);

  // Get products with eBay mappings
  const { data: mappings, error: mappingsError } = await supabaseAdmin
    .from("marketplace_product_mappings")
    .select(`
      *,
      products (
        id,
        name,
        stock_quantity,
        ean
      )
    `)
    .eq("marketplace_name", "eBay")
    .eq("is_synced", true);

  if (mappingsError) {
    throw new Error(`Failed to fetch product mappings: ${mappingsError.message}`);
  }

  // Prepare stock updates
  const stockUpdates = (mappings || [])
    .filter((m: any) => m.products && m.marketplace_sku)
    .map((m: any) => ({
      sku: m.marketplace_sku,
      quantity: m.products.stock_quantity || 0,
    }));

  console.log(`[eBay] Found ${stockUpdates.length} products to sync`);

  if (stockUpdates.length === 0) {
    await supabaseAdmin
      .from("marketplace_sync_logs")
      .update({
        status: "completed",
        items_synced: 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog?.id);

    return {
      success: true,
      message: "No products configured for eBay sync",
      items_synced: 0,
    };
  }

  // Get access token
  const credentials: EbayCredentials = {
    client_id: ebayClientId,
    client_secret: ebayClientSecret,
    refresh_token: ebayRefreshToken,
    marketplace_id: ebayMarketplaceId,
  };

  const accessToken = await getEbayAccessToken(credentials);
  console.log(`[eBay] Got access token`);

  // Update inventory
  const result = await updateEbayInventory(
    accessToken,
    ebayMarketplaceId,
    stockUpdates
  );

  // Update sync log
  await supabaseAdmin
    .from("marketplace_sync_logs")
    .update({
      status: result.success ? "completed" : "error",
      items_synced: stockUpdates.length,
      errors: result.errors.length > 0 ? { errors: result.errors } : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", syncLog?.id);

  // Update marketplace connection
  await supabaseAdmin
    .from("marketplace_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      sync_status: result.success ? "synced" : "error",
    })
    .eq("marketplace_name", "eBay");

  // Update individual product mappings
  const now = new Date().toISOString();
  for (const mapping of mappings || []) {
    await supabaseAdmin
      .from("marketplace_product_mappings")
      .update({ last_stock_sync_at: now })
      .eq("id", mapping.id);
  }

  console.log(`[eBay] Sync completed: ${stockUpdates.length} items, ${result.errors.length} errors`);

  return {
    success: result.success,
    items_synced: stockUpdates.length,
    errors: result.errors,
  };
}));
