import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "shopify-status",
  auth: "admin",
  methods: ["POST", "GET"],
}, async ({ supabaseAdmin }) => {
  // Récupère config (sans exposer les secrets)
  const { data: config, error: configError } = await supabaseAdmin
    .from("shopify_config")
    .select("shop_domain, api_version, pos_active, pos_location_id, access_token_set, webhook_secret_set, last_health_check, health_status, product_count, updated_at")
    .single();

  if (configError || !config) {
    throw new Error("Configuration Shopify introuvable");
  }

  // Test connexion Shopify via l'access token stocké en env var Supabase
  let shopifyStatus: "connected" | "error" | "unreachable" | "unknown" = "unknown";
  let productCount = config.product_count;
  const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

  if (shopifyToken) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const shopifyRes = await fetch(
        `https://${config.shop_domain}/admin/api/${config.api_version}/products/count.json`,
        {
          headers: { "X-Shopify-Access-Token": shopifyToken },
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (shopifyRes.ok) {
        const data = await shopifyRes.json();
        productCount = data.count;
        shopifyStatus = "connected";
      } else if (shopifyRes.status === 401) {
        shopifyStatus = "error";
      } else {
        shopifyStatus = "error";
      }
    } catch {
      shopifyStatus = "unreachable";
    }
  }

  // Mettre à jour le statut dans Supabase
  await supabaseAdmin
    .from("shopify_config")
    .update({
      health_status: shopifyStatus,
      product_count: productCount,
      last_health_check: new Date().toISOString(),
    })
    .eq("shop_domain", config.shop_domain);

  // Récupère les 20 derniers logs
  const { data: recentLogs } = await supabaseAdmin
    .from("shopify_sync_log")
    .select("id, operation, direction, status, items_affected, error_message, triggered_by, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Stats agrégées
  const { data: stats } = await supabaseAdmin
    .from("shopify_sync_log")
    .select("status")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const statsAgg = {
    last24h: {
      total: stats?.length ?? 0,
      success: stats?.filter((s: { status: string }) => s.status === "success").length ?? 0,
      error: stats?.filter((s: { status: string }) => s.status === "error").length ?? 0,
    },
  };

  return {
    config: { ...config, health_status: shopifyStatus, product_count: productCount },
    recentLogs: recentLogs ?? [],
    stats: statsAgg,
  };
}));
