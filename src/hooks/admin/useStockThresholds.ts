import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockThreshold {
  id: string;
  product_id: string;
  shopify_variant_id: string | null;
  min_quantity: number;
  reorder_quantity: number;
  supplier_id: string | null;
  lead_time_days: number;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_sku?: string;
  supplier_name?: string;
}

export function useStockThresholds() {
  return useQuery({
    queryKey: ["stock-thresholds"],
    queryFn: async () => {
      const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      const { data, error } = await client
        .from("stock_thresholds")
        .select("*, products(name, sku), suppliers(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      type RawThreshold = Omit<StockThreshold, 'product_name' | 'product_sku' | 'supplier_name'> & {
        products?: { name: string; sku: string } | null;
        suppliers?: { name: string } | null;
      };
      return ((data ?? []) as RawThreshold[]).map((t) => ({
        ...t,
        product_name: t.products?.name ?? null,
        product_sku: t.products?.sku ?? null,
        supplier_name: t.suppliers?.name ?? null,
      })) as StockThreshold[];
    },
    staleTime: 5 * 60_000,
  });
}

interface UpsertThresholdInput {
  id?: string;
  product_id: string;
  min_quantity: number;
  reorder_quantity: number;
  supplier_id?: string | null;
  lead_time_days?: number;
}

export function useUpsertStockThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertThresholdInput) => {
      const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      if (input.id) {
        // @ts-expect-error stock_thresholds not in generated Supabase types
        const { error } = await client
          .from("stock_thresholds")
          .update({
            min_quantity: input.min_quantity,
            reorder_quantity: input.reorder_quantity,
            supplier_id: input.supplier_id || null,
            lead_time_days: input.lead_time_days ?? 7,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await client.from("stock_thresholds").insert({
          product_id: input.product_id,
          min_quantity: input.min_quantity,
          reorder_quantity: input.reorder_quantity,
          supplier_id: input.supplier_id || null,
          lead_time_days: input.lead_time_days ?? 7,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-thresholds"] });
      queryClient.invalidateQueries({ queryKey: ["stock-alerts"] });
    },
  });
}

export function useDeleteStockThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      const { error } = await client
        .from("stock_thresholds")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-thresholds"] });
    },
  });
}
