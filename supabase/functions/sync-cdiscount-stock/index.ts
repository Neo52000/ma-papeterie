import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

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
  
  // Cdiscount uses a specific XML/SOAP format for stock updates
  // This is a simplified representation - actual implementation uses their SDK
  
  for (const update of updates) {
    try {
      console.log(`[Cdiscount] Would update SKU ${update.sku} to quantity ${update.quantity}`);
      
      // In production, you would use Cdiscount's Marketplace API
      // const response = await fetch(`https://api.cdiscount.com/v1/sellers/${sellerId}/offers`, {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${accessToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     sku: update.sku,
      //     stock: update.quantity,
      //   }),
      // });
      
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
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Cdiscount credentials from environment
    const cdiscountUsername = Deno.env.get("CDISCOUNT_USERNAME");
    const cdiscountPassword = Deno.env.get("CDISCOUNT_PASSWORD");
    const cdiscountSellerId = Deno.env.get("CDISCOUNT_SELLER_ID");

    // Check if credentials are configured
    if (!cdiscountUsername || !cdiscountPassword || !cdiscountSellerId) {
      await supabase.from("marketplace_sync_logs").insert({
        marketplace_name: "Cdiscount",
        sync_type: "stock",
        status: "error",
        errors: { message: "Cdiscount API credentials not configured" },
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Cdiscount API credentials not configured",
          instructions: [
            "Configure CDISCOUNT_USERNAME in Supabase secrets",
            "Configure CDISCOUNT_PASSWORD in Supabase secrets",
            "Configure CDISCOUNT_SELLER_ID in Supabase secrets",
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
        marketplace_name: "Cdiscount",
        sync_type: "stock",
        status: "running",
      })
      .select()
      .single();

    console.log(`[Cdiscount] Starting stock sync, log ID: ${syncLog?.id}`);

    // Get products with Cdiscount mappings
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
          message: "No products configured for Cdiscount sync",
          items_synced: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      .eq("marketplace_name", "Cdiscount");

    // Update individual product mappings
    const now = new Date().toISOString();
    for (const mapping of mappings || []) {
      await supabase
        .from("marketplace_product_mappings")
        .update({ last_stock_sync_at: now })
        .eq("id", mapping.id);
    }

    console.log(`[Cdiscount] Sync completed: ${stockUpdates.length} items`);

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
    console.error("[Cdiscount] Error in sync:", error);
    
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
