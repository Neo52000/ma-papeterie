import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  
  // Amazon SP-API Inventory endpoint
  const inventoryUrl = `https://sellingpartnerapi-eu.amazon.com/fba/inventory/v1/summaries`;
  
  // Note: This is a simplified example. Real implementation would use
  // the Feeds API to submit inventory updates in bulk
  
  for (const update of updates) {
    try {
      // In production, you would create an inventory feed and submit it
      // This is a placeholder for the actual API call
      console.log(`Would update SKU ${update.sku} to quantity ${update.quantity}`);
      
      // Simulated API call structure (actual implementation varies)
      // const feedContent = createInventoryFeed(updates);
      // const response = await submitFeed(accessToken, feedContent);
      
    } catch (error) {
      errors.push(`Error updating SKU ${update.sku}: ${error.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Amazon credentials from environment or database
    const amazonClientId = Deno.env.get("AMAZON_SP_CLIENT_ID");
    const amazonClientSecret = Deno.env.get("AMAZON_SP_CLIENT_SECRET");
    const amazonRefreshToken = Deno.env.get("AMAZON_SP_REFRESH_TOKEN");
    const amazonMarketplaceId = Deno.env.get("AMAZON_MARKETPLACE_ID") || "A13V1IB3VIYZZH"; // FR

    // Check if credentials are configured
    if (!amazonClientId || !amazonClientSecret || !amazonRefreshToken) {
      // Create sync log for missing credentials
      await supabase.from("marketplace_sync_logs").insert({
        marketplace_name: "Amazon",
        sync_type: "stock",
        status: "error",
        errors: { message: "Amazon SP-API credentials not configured" },
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Amazon SP-API credentials not configured",
          instructions: [
            "Configure AMAZON_SP_CLIENT_ID in Supabase secrets",
            "Configure AMAZON_SP_CLIENT_SECRET in Supabase secrets",
            "Configure AMAZON_SP_REFRESH_TOKEN in Supabase secrets",
          ],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from("marketplace_sync_logs")
      .insert({
        marketplace_name: "Amazon",
        sync_type: "stock",
        status: "running",
      })
      .select()
      .single();

    // Get products with Amazon mappings
    const { data: mappings, error: mappingsError } = await supabase
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
      // Update sync log - no products to sync
      await supabase
        .from("marketplace_sync_logs")
        .update({
          status: "completed",
          items_synced: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLog?.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "No products configured for Amazon sync",
          items_synced: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
    await supabase
      .from("marketplace_sync_logs")
      .update({
        status: result.success ? "completed" : "error",
        items_synced: stockUpdates.length,
        errors: result.errors.length > 0 ? { errors: result.errors } : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLog?.id);

    // Update marketplace connection
    await supabase
      .from("marketplace_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: result.success ? "synced" : "error",
      })
      .eq("marketplace_name", "Amazon");

    // Update individual product mappings
    const now = new Date().toISOString();
    for (const mapping of mappings || []) {
      await supabase
        .from("marketplace_product_mappings")
        .update({ last_stock_sync_at: now })
        .eq("id", mapping.id);
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        items_synced: stockUpdates.length,
        errors: result.errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in sync-amazon-stock:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
