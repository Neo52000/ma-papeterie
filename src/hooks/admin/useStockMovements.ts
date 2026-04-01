import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockMovement {
  id: string;
  product_id: string;
  shopify_variant_id: string | null;
  movement_type: "sale" | "restock" | "adjustment" | "return" | "loss" | "sync";
  quantity_delta: number;
  stock_before: number | null;
  stock_after: number | null;
  reference_id: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  product_name?: string;
}

interface UseStockMovementsFilters {
  productId?: string | null;
  movementType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
}

export function useStockMovements(filters: UseStockMovementsFilters = {}) {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 50;

  return useQuery({
    queryKey: ["stock-movements", filters],
    queryFn: async () => {
      const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      let query = client
        .from("stock_movements")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.productId) {
        // @ts-expect-error stock_movements not in generated Supabase types
        query = query.eq("product_id", filters.productId);
      }
      if (filters.movementType) {
        // @ts-expect-error stock_movements not in generated Supabase types
        query = query.eq("movement_type", filters.movementType);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as any[]).map((m) => ({
        ...m,
        product_name: m.products?.name ?? null,
      })) as StockMovement[];
    },
    staleTime: 2 * 60_000,
  });
}

interface CreateMovementInput {
  product_id: string;
  movement_type: StockMovement["movement_type"];
  quantity_delta: number;
  notes?: string;
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMovementInput) => {
      // Get current stock
      const { data: product } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", input.product_id)
        .single();

      const stockBefore = product?.stock_quantity ?? 0;
      const stockAfter = Math.max(0, stockBefore + input.quantity_delta);

      // Insert movement
      const client = supabase as unknown as {
        from: (table: string) => ReturnType<typeof supabase.from>;
      };

      const { error: moveError } = await client.from("stock_movements").insert({
        product_id: input.product_id,
        movement_type: input.movement_type,
        quantity_delta: input.quantity_delta,
        stock_before: stockBefore,
        stock_after: stockAfter,
        source: "manual",
        notes: input.notes || null,
      });
      if (moveError) throw moveError;

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: stockAfter })
        .eq("id", input.product_id);
      if (updateError) throw updateError;

      return { stockBefore, stockAfter };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-alerts-count"] });
    },
  });
}
