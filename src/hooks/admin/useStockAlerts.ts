import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockAlert {
  product_id: string;
  name: string;
  sku: string;
  shopify_variant_id: string | null;
  current_stock: number;
  min_quantity: number;
  reorder_quantity: number;
  supplier_id: string | null;
  supplier_name: string | null;
  lead_time_days: number;
  stock_status: "rupture" | "critique" | "faible" | "ok";
}

interface UseStockAlertsFilters {
  supplierId?: string | null;
  status?: string | null;
  search?: string;
}

const STATUS_ORDER: Record<string, number> = {
  rupture: 0,
  critique: 1,
  faible: 2,
  ok: 3,
};

export function useStockAlerts(filters: UseStockAlertsFilters = {}) {
  return useQuery({
    queryKey: ["stock-alerts", filters],
    queryFn: async () => {
      // stock_alerts is a materialized view — not in auto-generated types
      const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      let query = client.from("stock_alerts").select("*");

      if (filters.supplierId) {
        // @ts-expect-error stock_alerts not in generated Supabase types
        query = query.eq("supplier_id", filters.supplierId);
      }
      if (filters.status) {
        query = query.eq("stock_status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data ?? []) as unknown as StockAlert[];

      // Client-side search filter (name or sku)
      if (filters.search) {
        const term = filters.search.toLowerCase();
        results = results.filter(
          (a) =>
            a.name?.toLowerCase().includes(term) ||
            a.sku?.toLowerCase().includes(term),
        );
      }

      // Sort by severity: rupture > critique > faible > ok
      results.sort(
        (a, b) =>
          (STATUS_ORDER[a.stock_status] ?? 9) -
          (STATUS_ORDER[b.stock_status] ?? 9),
      );

      return results;
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}

/** Light hook for badge count only */
export function useStockAlertsCount() {
  return useQuery({
    queryKey: ["stock-alerts-count"],
    queryFn: async () => {
      const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      // @ts-expect-error stock_alerts not in generated Supabase types
      const { data, error } = await client
        .from("stock_alerts")
        .select("product_id", { count: "exact", head: true })
        .eq("stock_status", "rupture");

      if (error) return 0;
      return (data as any)?.length ?? 0;
    },
    staleTime: 5 * 60_000,
  });
}
