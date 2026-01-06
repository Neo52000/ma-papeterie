import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      
      // eBay Inventory API - Update or Create Inventory Item
      const inventoryUrl = `https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(update.sku)}`;
      
      // First, get current inventory item
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
        
        // Update the availability
        inventoryItem.availability = {
          shipToLocationAvailability: {
            quantity: update.quantity,
          },
        };

        // PUT updated inventory item
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get eBay credentials from environment
    const ebayClientId = Deno.env.get("EBAY_CLIENT_ID");
    const ebayClientSecret = Deno.env.get("EBAY_CLIENT_SECRET");
    const ebayRefreshToken = Deno.env.get("EBAY_REFRESH_TOKEN");
    const ebayMarketplaceId = Deno.env.get("EBAY_MARKETPLACE_ID") || "EBAY_FR";

    // Check if credentials are configured
    if (!ebayClientId || !ebayClientSecret || !ebayRefreshToken) {
      await supabase.from("marketplace_sync_logs").insert({
        marketplace_name: "eBay",
        sync_type: "stock",
        status: "error",
        errors: { message: "eBay API credentials not configured" },
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "eBay API credentials not configured",
          instructions: [
            "Configure EBAY_CLIENT_ID in Supabase secrets",
            "Configure EBAY_CLIENT_SECRET in Supabase secrets",
            "Configure EBAY_REFRESH_TOKEN in Supabase secrets",
            "Optionally set EBAY_MARKETPLACE_ID (default: EBAY_FR)",
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
        marketplace_name: "eBay",
        sync_type: "stock",
        status: "running",
      })
      .select()
      .single();

    console.log(`[eBay] Starting stock sync, log ID: ${syncLog?.id}`);

    // Get products with eBay mappings
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
          message: "No products configured for eBay sync",
          items_synced: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      .eq("marketplace_name", "eBay");

    // Update individual product mappings
    const now = new Date().toISOString();
    for (const mapping of mappings || []) {
      await supabase
        .from("marketplace_product_mappings")
        .update({ last_stock_sync_at: now })
        .eq("id", mapping.id);
    }

    console.log(`[eBay] Sync completed: ${stockUpdates.length} items, ${result.errors.length} errors`);

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
    console.error("[eBay] Error in sync:", error);
    
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
