import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, requireApiSecret, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { getShopifyConfig, shopifyFetch } from "../_shared/shopify-config.ts";

/**
 * Pull Shopify Inventory
 *
 * Récupère les niveaux d'inventaire depuis Shopify pour synchroniser
 * les stocks bidirectionnellement (ventes POS → décrémentation locale).
 *
 * Supporte les emplacements multiples (entrepôt, boutiques POS).
 *
 * Paramètres :
 * - location_id : ID d'emplacement Shopify spécifique (optionnel)
 * - product_ids : IDs internes à vérifier (optionnel, sinon tous les produits sync)
 */

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "pull-shopify-inventory");
  if (!(await checkRateLimit(rlKey, 5, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  // Auth: admin JWT ou API secret (cron)
  const authResult = await requireAdmin(req, corsHeaders);
  if (isAuthError(authResult)) {
    const secretError = requireApiSecret(req, corsHeaders);
    if (secretError) return authResult.error;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const locationId = body.location_id;
    const productIds = body.product_ids;

    // Config Shopify via module partagé
    const config = await getShopifyConfig(supabase);
    const targetLocationId = locationId || config.location_id;

    if (!config.access_token) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Charger les produits à synchroniser (avec leur Shopify ID)
    let syncQuery = supabase
      .from("shopify_sync_log")
      .select("product_id, shopify_product_id")
      .eq("status", "success")
      .eq("sync_type", "create")
      .order("synced_at", { ascending: false });

    if (productIds?.length) {
      syncQuery = syncQuery.in("product_id", productIds);
    }

    const { data: syncedProducts } = await syncQuery;
    if (!syncedProducts?.length) {
      return new Response(
        JSON.stringify({ message: "No synced products to check", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Dédupliquer (prendre le mapping le plus récent par product_id)
    const productToShopify = new Map<string, string>();
    for (const sp of syncedProducts) {
      if (!productToShopify.has(sp.product_id)) {
        productToShopify.set(sp.product_id, sp.shopify_product_id);
      }
    }

    let updated = 0, skipped = 0, errors = 0;
    const shopifyIds = [...new Set(productToShopify.values())];

    // Traiter par batch (Shopify limite à 250 produits par requête)
    const BATCH = 50;
    for (let i = 0; i < shopifyIds.length; i += BATCH) {
      const batch = shopifyIds.slice(i, i + BATCH);

      for (const shopifyProductId of batch) {
        try {
          // Récupérer le produit Shopify avec ses variants via module partagé
          let productData;
          try {
            productData = await shopifyFetch(
              config,
              `/products/${shopifyProductId}.json?fields=id,variants`,
            );
          } catch (e: any) {
            if (e.message?.includes("404")) {
              skipped++;
              continue;
            }
            throw e;
          }
          const variants = productData.product?.variants || [];

          if (variants.length === 0) { skipped++; continue; }

          // Prendre le premier variant (produit simple)
          const variant = variants[0];
          const inventoryItemId = variant.inventory_item_id;

          // Si un location_id est spécifié, récupérer le stock par emplacement
          let shopifyStock = variant.inventory_quantity ?? 0;

          if (targetLocationId && inventoryItemId) {
            try {
              const invData = await shopifyFetch(
                config,
                `/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${targetLocationId}`,
              );
              const level = invData.inventory_levels?.[0];
              if (level) {
                shopifyStock = level.available ?? shopifyStock;
              }
            } catch {
              // Ignorer les erreurs d'inventaire par emplacement, garder le stock du variant
            }
          }

          // Trouver le product_id interne
          let internalProductId: string | null = null;
          for (const [pid, sid] of productToShopify) {
            if (sid === shopifyProductId) {
              internalProductId = pid;
              break;
            }
          }

          if (internalProductId) {
            // Comparer avec le stock local
            const { data: localProduct } = await supabase
              .from("products")
              .select("stock_quantity")
              .eq("id", internalProductId)
              .single();

            if (localProduct && localProduct.stock_quantity !== shopifyStock) {
              // Mettre à jour le stock local (Shopify est la source de vérité pour le POS)
              await supabase
                .from("products")
                .update({
                  stock_quantity: Math.max(0, shopifyStock),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", internalProductId);

              updated++;
            } else {
              skipped++;
            }
          }
        } catch (e: any) {
          errors++;
          console.error(`Inventory check ${shopifyProductId}: ${e.message}`);
        }
      }
    }

    // Log
    await supabase.from("shopify_sync_log").insert({
      sync_type: "pull_inventory",
      sync_direction: "pull",
      status: errors === 0 ? "success" : "partial",
      details: {
        updated,
        skipped,
        errors,
        total: shopifyIds.length,
        location_id: targetLocationId || "all",
      },
    });

    return new Response(
      JSON.stringify({
        message: "Inventory pull completed",
        updated,
        skipped,
        errors,
        total: shopifyIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Erreur lors du pull d'inventaire Shopify" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
