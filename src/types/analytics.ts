// ── Types partagés — Module Analytique Phase 2 ────────────────────────────────

export type RevenuePeriod = 'day' | 'week' | 'month';

export interface TopProduct {
  title: string;
  revenue: number;
  quantity: number;
}

export interface RevenueSnapshot {
  ca_ttc: number;
  ca_ht: number;
  orders_count: number;
  avg_basket_ttc: number;
  top_products: TopProduct[];
}

export interface RevenueDelta {
  ca_ttc_pct: number;
  orders_count_pct: number;
  avg_basket_pct: number;
}

export interface RevenueData {
  period: RevenuePeriod;
  current: RevenueSnapshot;
  previous: RevenueSnapshot | null;
  delta: RevenueDelta | null;
  generated_at: string;
}

export interface CatalogueProduct {
  id: string;
  name: string;
  slug: string | null;
  stock_quantity?: number | null;
  price_ttc?: number | null;
}

export interface CatalogueStats {
  total: number;
  actifs: number;
  ruptures: number;
  stock_bas: number;
  sans_image: number;
  sans_description: number;
}

export interface CatalogueData {
  stats: CatalogueStats;
  ruptures: CatalogueProduct[];
  stock_bas: CatalogueProduct[];
  sans_image: CatalogueProduct[];
  sans_description: CatalogueProduct[];
  generated_at: string;
}
