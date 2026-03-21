import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { getShopifyConfig, SHOPIFY_API_VERSION } from "../_shared/shopify-config.ts";
import type { ShopifyConfig } from "../_shared/shopify-config.ts";

/**
 * Analytics Shopify — CA & Ventes.
 *
 * Proxy sécurisé vers l'API Shopify Admin REST pour calculer :
 * - CA TTC / HT
 * - Nombre de commandes
 * - Panier moyen
 * - Top 5 produits par CA
 * - Comparaison avec la période précédente (delta %)
 */

type Period = "day" | "week" | "month";

interface TopProduct {
  title: string;
  revenue: number;
  quantity: number;
}

interface RevenueSnapshot {
  ca_ttc: number;
  ca_ht: number;
  orders_count: number;
  avg_basket_ttc: number;
  top_products: TopProduct[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodRange(period: Period, offset = 0): { min: string; max: string } {
  const now = new Date();
  let daysBack: number;

  switch (period) {
    case "day":
      daysBack = 1;
      break;
    case "week":
      daysBack = 7;
      break;
    case "month":
      daysBack = 30;
      break;
  }

  const end = new Date(now);
  end.setDate(end.getDate() - offset * daysBack);

  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);

  return {
    min: start.toISOString(),
    max: end.toISOString(),
  };
}

function computeDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function fetchAllOrders(
  config: ShopifyConfig,
  dateMin: string,
  dateMax: string,
): Promise<any[]> {
  const allOrders: any[] = [];
  const fields = "id,created_at,total_price,subtotal_price,financial_status,line_items";
  let url = `https://${config.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&created_at_min=${encodeURIComponent(dateMin)}&created_at_max=${encodeURIComponent(dateMax)}&fields=${fields}&limit=250`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.access_token,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API ${response.status}: ${text}`);
    }

    const callLimit = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
    if (callLimit) {
      const [used, max] = callLimit.split("/").map(Number);
      if (used >= max - 2) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const data = await response.json();
    allOrders.push(...(data.orders ?? []));

    const linkHeader = response.headers.get("Link") ?? "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : "";
  }

  return allOrders;
}

function aggregateOrders(orders: any[]): RevenueSnapshot {
  const validStatuses = new Set(["paid", "partially_paid"]);
  const paidOrders = orders.filter((o) => validStatuses.has(o.financial_status));

  const ca_ttc = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_price || "0"), 0);
  const ca_ht = paidOrders.reduce((sum, o) => sum + parseFloat(o.subtotal_price || "0"), 0);
  const orders_count = paidOrders.length;
  const avg_basket_ttc = orders_count > 0 ? ca_ttc / orders_count : 0;

  const productMap = new Map<string, { revenue: number; quantity: number }>();
  for (const order of paidOrders) {
    for (const item of order.line_items ?? []) {
      const title = item.title ?? "Produit inconnu";
      const existing = productMap.get(title) ?? { revenue: 0, quantity: 0 };
      existing.revenue += parseFloat(item.price || "0") * (item.quantity ?? 1);
      existing.quantity += item.quantity ?? 1;
      productMap.set(title, existing);
    }
  }

  const top_products: TopProduct[] = [...productMap.entries()]
    .map(([title, data]) => ({
      title,
      revenue: Math.round(data.revenue * 100) / 100,
      quantity: data.quantity,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    ca_ttc: Math.round(ca_ttc * 100) / 100,
    ca_ht: Math.round(ca_ht * 100) / 100,
    orders_count,
    avg_basket_ttc: Math.round(avg_basket_ttc * 100) / 100,
    top_products,
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(createHandler({
  name: "analytics-shopify",
  auth: "admin",
  rateLimit: { prefix: "analytics-shopify", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const b = (body ?? {}) as Record<string, unknown>;
  const period: Period = ["day", "week", "month"].includes(b.period as string)
    ? (b.period as Period)
    : "month";
  const compare = b.compare !== false;

  const config = await getShopifyConfig(supabaseAdmin);

  if (!config.access_token || !config.shop_domain) {
    return jsonResponse(
      { error: "Configuration Shopify manquante" },
      500,
      corsHeaders,
    );
  }

  // Période courante
  const currentRange = getPeriodRange(period, 0);
  const currentOrders = await fetchAllOrders(config, currentRange.min, currentRange.max);
  const current = aggregateOrders(currentOrders);

  // Période précédente (N-1)
  let previous: RevenueSnapshot | null = null;
  let delta: { ca_ttc_pct: number; orders_count_pct: number; avg_basket_pct: number } | null = null;

  if (compare) {
    const previousRange = getPeriodRange(period, 1);
    const previousOrders = await fetchAllOrders(config, previousRange.min, previousRange.max);
    previous = aggregateOrders(previousOrders);
    delta = {
      ca_ttc_pct: computeDelta(current.ca_ttc, previous.ca_ttc),
      orders_count_pct: computeDelta(current.orders_count, previous.orders_count),
      avg_basket_pct: computeDelta(current.avg_basket_ttc, previous.avg_basket_ttc),
    };
  }

  return {
    period,
    current,
    previous,
    delta,
    generated_at: new Date().toISOString(),
  };
}));
