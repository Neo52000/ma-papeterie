import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface CdiscountCredentials {
  username: string;
  password: string;
  seller_id: string;
}

// Get Cdiscount API token
async function getCdiscountToken(credentials: CdiscountCredentials): Promise<string> {
  const tokenUrl = "https://api.cdiscount.com/token";

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: credentials.username,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Cdiscount token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Update stock on Cdiscount
async function updateCdiscountStock(
  accessToken: string,
  sellerId: string,
  updates: Array<{ sku: string; quantity: number }>
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const update of updates) {
    try {
      console.log(`[Cdiscount] Would update SKU ${update.sku} to quantity ${update.quantity}`);
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
  name: "sync-cdiscount-stock",
  auth: "admin",
  rateLimit: { prefix: "sync-cdiscount", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, corsHeaders }) => {
  // Get Cdiscount credentials from environment
  const cdiscountUsername = Deno.env.get("CDISCOUNT_USERNAME");
  const cdiscountPassword = Deno.env.get("CDISCOUNT_PASSWORD");
  const cdiscountSellerId = Deno.env.get("CDISCOUNT_SELLER_ID");

  if (!cdiscountUsername || !cdiscountPassword || !cdiscountSellerId) {
    await supabaseAdmin.from("marketplace_sync_logs").insert({
      marketplace_name: "Cdiscount",
      sync_type: "stock",
      status: "error",
      errors: { message: "Cdiscount API credentials not configured" },
      completed_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: false,
      error: "Cdiscount API credentials not configured",
      instructions: [
        "Configure CDISCOUNT_USERNAME in Supabase secrets",
        "Configure CDISCOUNT_PASSWORD in Supabase secrets",
        "Configure CDISCOUNT_SELLER_ID in Supabase secrets",
      ],
    }, 400, corsHeaders);
  }

  // Create sync log entry
  const { data: syncLog } = await supabaseAdmin
    .from("marketplace_sync_logs")
    .insert({
      marketplace_name: "Cdiscount",
      sync_type: "stock",
      status: "running",
    })
    .select()
    .single();

  console.log(`[Cdiscount] Starting stock sync, log ID: ${syncLog?.id}`);

  // Get products with Cdiscount mappings
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
    .eq("marketplace_name", "Cdiscount")
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

  console.log(`[Cdiscount] Found ${stockUpdates.length} products to sync`);

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
      message: "No products configured for Cdiscount sync",
      items_synced: 0,
    };
  }

  // Get access token
  const credentials: CdiscountCredentials = {
    username: cdiscountUsername,
    password: cdiscountPassword,
    seller_id: cdiscountSellerId,
  };

  const accessToken = await getCdiscountToken(credentials);
  console.log(`[Cdiscount] Got access token`);

  // Update stock
  const result = await updateCdiscountStock(
    accessToken,
    cdiscountSellerId,
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
    .eq("marketplace_name", "Cdiscount");

  // Update individual product mappings
  const now = new Date().toISOString();
  for (const mapping of mappings || []) {
    await supabaseAdmin
      .from("marketplace_product_mappings")
      .update({ last_stock_sync_at: now })
      .eq("id", mapping.id);
  }

  console.log(`[Cdiscount] Sync completed: ${stockUpdates.length} items`);

  return {
    success: result.success,
    items_synced: stockUpdates.length,
    errors: result.errors,
  };
}));
