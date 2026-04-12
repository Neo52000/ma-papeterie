/**
 * reconcile-shopify-products — Detects drift between Shopify and Supabase catalogs.
 *
 * Runs daily via cron (04:00 UTC) or manually from admin dashboard.
 *
 * Detects:
 *   - Orphaned mappings: Shopify product no longer exists (404)
 *   - Unmapped Shopify products: exist in Shopify but not in shopify_product_mapping
 *   - Stale data: timestamps out of sync
 *
 * Modes:
 *   - detect: report only (no writes except conflict_status updates)
 *   - fix: auto-resolve safe conflicts (mark orphans stale, create mappings for unmapped)
 *
 * Body: { mode: "detect" | "fix", batch_size?: number }
 */

import { createHandler } from "../_shared/handler.ts";
import { getShopifyConfig, shopifyFetch } from "../_shared/shopify-config.ts";

const DEFAULT_BATCH_SIZE = 250;
const MAX_PAGES = 50;

interface ReconcileBody {
  mode: "detect" | "fix";
  batch_size?: number;
}

Deno.serve(createHandler({
  name: "reconcile-shopify-products",
  auth: "admin-or-secret",
  rateLimit: { prefix: "reconcile-shopify", max: 3, windowMs: 300_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { mode = "detect", batch_size = DEFAULT_BATCH_SIZE } = (body || {}) as ReconcileBody;
  const startTime = Date.now();

  const config = await getShopifyConfig(supabaseAdmin);
  if (!config.shop_domain || !config.access_token) {
    return new Response(JSON.stringify({ error: "Shopify not configured" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 1. Fetch ALL Shopify products (paginated) ──
  const shopifyProductMap = new Map<string, { id: string; updated_at: string; title: string; barcode: string | null }>();
  let pageUrl = `/products.json?limit=${batch_size}&fields=id,updated_at,title,variants`;
  let pageCount = 0;

  while (pageUrl && pageCount < MAX_PAGES) {
    const result = await shopifyFetch(config, pageUrl);
    const products = result.products || [];

    for (const p of products) {
      shopifyProductMap.set(String(p.id), {
        id: String(p.id),
        updated_at: p.updated_at,
        title: p.title,
        barcode: p.variants?.[0]?.barcode || null,
      });
    }

    pageCount++;
    if (products.length === batch_size) {
      const lastId = products[products.length - 1].id;
      pageUrl = `/products.json?limit=${batch_size}&since_id=${lastId}&fields=id,updated_at,title,variants`;
    } else {
      break;
    }
  }

  // ── 2. Load all existing mappings ──
  const { data: allMappings } = await supabaseAdmin
    .from("shopify_product_mapping")
    .select("id, product_id, shopify_product_id, shopify_updated_at, last_synced_at, stale");

  const mappingByShopifyId = new Map(
    (allMappings || []).map((m: any) => [m.shopify_product_id, m])
  );

  // ── 3. Detect drift ──
  const stats = {
    shopify_total: shopifyProductMap.size,
    mappings_total: (allMappings || []).length,
    orphaned_mappings: 0,
    unmapped_shopify: 0,
    stale_data: 0,
    already_stale: 0,
    fixed: 0,
  };

  const issues: Array<{ type: string; shopify_id?: string; product_id?: string; detail: string }> = [];

  // 3a. Orphaned mappings: in Supabase mapping but NOT in Shopify
  for (const mapping of (allMappings || [])) {
    if (mapping.stale) {
      stats.already_stale++;
      continue;
    }
    if (!shopifyProductMap.has(mapping.shopify_product_id)) {
      stats.orphaned_mappings++;
      issues.push({
        type: "orphaned",
        shopify_id: mapping.shopify_product_id,
        product_id: mapping.product_id,
        detail: "Mapping exists but Shopify product not found",
      });

      if (mode === "fix") {
        await supabaseAdmin.from("shopify_product_mapping")
          .update({ stale: true, conflict_status: "none" })
          .eq("id", mapping.id);
        stats.fixed++;
      }
    }
  }

  // 3b. Unmapped Shopify products: in Shopify but NOT in mapping
  for (const [shopifyId, sp] of shopifyProductMap) {
    if (!mappingByShopifyId.has(shopifyId)) {
      stats.unmapped_shopify++;
      issues.push({
        type: "unmapped",
        shopify_id: shopifyId,
        detail: `Shopify product "${sp.title}" has no mapping (barcode: ${sp.barcode || "none"})`,
      });

      if (mode === "fix" && sp.barcode && sp.barcode.length >= 8) {
        // Try EAN match
        const { data: eanMatch } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("ean", sp.barcode)
          .limit(1)
          .maybeSingle();

        if (eanMatch) {
          await supabaseAdmin.from("shopify_product_mapping").upsert({
            product_id: eanMatch.id,
            shopify_product_id: shopifyId,
            shopify_updated_at: sp.updated_at,
            sync_direction: "pull",
            last_pull_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
            conflict_status: "none",
          }, { onConflict: "shopify_product_id" });
          stats.fixed++;
        }
      }
    }
  }

  // 3c. Stale data: timestamps mismatch
  for (const mapping of (allMappings || [])) {
    if (mapping.stale) continue;
    const sp = shopifyProductMap.get(mapping.shopify_product_id);
    if (!sp) continue;

    const shopifyTime = new Date(sp.updated_at).getTime();
    const lastKnown = mapping.shopify_updated_at
      ? new Date(mapping.shopify_updated_at).getTime()
      : 0;

    if (shopifyTime > lastKnown) {
      stats.stale_data++;
      issues.push({
        type: "stale",
        shopify_id: mapping.shopify_product_id,
        product_id: mapping.product_id,
        detail: `Shopify updated_at (${sp.updated_at}) is newer than last known (${mapping.shopify_updated_at || "never"})`,
      });

      if (mode === "fix") {
        await supabaseAdmin.from("shopify_product_mapping")
          .update({
            shopify_updated_at: sp.updated_at,
            conflict_status: "shopify_newer",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", mapping.id);
        stats.fixed++;
      }
    }
  }

  const durationMs = Date.now() - startTime;

  // ── Log results ──
  await supabaseAdmin.from("shopify_sync_log").insert({
    sync_type: "reconciliation",
    sync_direction: "pull",
    operation: "reconciliation",
    status: "success",
    items_affected: stats.orphaned_mappings + stats.unmapped_shopify + stats.stale_data,
    duration_ms: durationMs,
    triggered_by: "manual",
    details: { mode, stats },
  });

  await supabaseAdmin.from("agent_logs").insert({
    agent_name: "reconcile-shopify-products",
    action: "reconcile",
    status: "success",
    duration_ms: durationMs,
    output_data: stats,
  });

  return {
    success: true,
    mode,
    stats,
    issues: issues.slice(0, 100),
    duration_ms: durationMs,
  };
}));
