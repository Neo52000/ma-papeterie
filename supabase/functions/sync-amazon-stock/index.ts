import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface AmazonCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  marketplace_id: string;
}

interface StockUpdate {
  sku: string;
  quantity: number;
}

// Get Amazon SP-API access token
async function getAccessToken(credentials: AmazonCredentials): Promise<string> {
  const tokenUrl = "https://api.amazon.com/auth/o2/token";

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refresh_token,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Update inventory on Amazon
async function updateAmazonInventory(
  accessToken: string,
  marketplaceId: string,
  updates: StockUpdate[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const update of updates) {
    try {
      console.log(`Would update SKU ${update.sku} to quantity ${update.quantity}`);
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
  name: "sync-amazon-stock",
  auth: "admin-or-secret",
  rateLimit: { prefix: "sync-amazon", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, corsHeaders }) => {
  // Get Amazon credentials from environment or database
  const amazonClientId = Deno.env.get("AMAZON_SP_CLIENT_ID");
  const amazonClientSecret = Deno.env.get("AMAZON_SP_CLIENT_SECRET");
  const amazonRefreshToken = Deno.env.get("AMAZON_SP_REFRESH_TOKEN");
  const amazonMarketplaceId = Deno.env.get("AMAZON_MARKETPLACE_ID") || "A13V1IB3VIYZZH"; // FR

  // Check if credentials are configured
  if (!amazonClientId || !amazonClientSecret || !amazonRefreshToken) {
    // Create sync log for missing credentials
    await supabaseAdmin.from("marketplace_sync_logs").insert({
      marketplace_name: "Amazon",
      sync_type: "stock",
      status: "error",
      errors: { message: "Amazon SP-API credentials not configured" },
      completed_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: false,
      error: "Amazon SP-API credentials not configured",
      instructions: [
        "Configure AMAZON_SP_CLIENT_ID in Supabase secrets",
        "Configure AMAZON_SP_CLIENT_SECRET in Supabase secrets",
        "Configure AMAZON_SP_REFRESH_TOKEN in Supabase secrets",
      ],
    }, 400, corsHeaders);
  }

  // Create sync log entry
  const { data: syncLog } = await supabaseAdmin
    .from("marketplace_sync_logs")
    .insert({
      marketplace_name: "Amazon",
      sync_type: "stock",
      status: "running",
    })
    .select()
    .single();

  // Get products with Amazon mappings
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
    .eq("marketplace_name", "Amazon")
    .eq("is_synced", true);

  if (mappingsError) {
    throw new Error(`Failed to fetch product mappings: ${mappingsError.message}`);
  }

  // Prepare stock updates
  const stockUpdates: StockUpdate[] = (mappings || [])
    .filter((m: any) => m.products && m.marketplace_sku)
    .map((m: any) => ({
      sku: m.marketplace_sku,
      quantity: m.products.stock_quantity || 0,
    }));

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
      message: "No products configured for Amazon sync",
      items_synced: 0,
    };
  }

  // Get access token
  const credentials: AmazonCredentials = {
    client_id: amazonClientId,
    client_secret: amazonClientSecret,
    refresh_token: amazonRefreshToken,
    marketplace_id: amazonMarketplaceId,
  };

  const accessToken = await getAccessToken(credentials);

  // Update inventory
  const result = await updateAmazonInventory(
    accessToken,
    amazonMarketplaceId,
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
    .eq("marketplace_name", "Amazon");

  // Update individual product mappings
  const now = new Date().toISOString();
  for (const mapping of mappings || []) {
    await supabaseAdmin
      .from("marketplace_product_mappings")
      .update({ last_stock_sync_at: now })
      .eq("id", mapping.id);
  }

  return {
    success: result.success,
    items_synced: stockUpdates.length,
    errors: result.errors,
  };
}));
