import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Consumable } from "./useConsumablesByModel";

export function useConsumablesSearch(query: string, limit: number = 10) {
  return useQuery({
    queryKey: ["consumables-search", query, limit],
    enabled: query.length >= 2,
    staleTime: 2 * 60_000,
    queryFn: async (): Promise<Consumable[]> => {
      const { data, error } = await (supabase as any)
        .from("consumables")
        .select("id, name, slug, sku, ean, consumable_type, brand, is_oem, color, capacity, page_yield, price_ht, price_ttc, image_url, description, stock_quantity")
        .eq("is_active", true)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,ean.ilike.%${query}%`)
        .order("name")
        .limit(limit);

      if (error) throw error;
      return (data ?? []).map((c: Record<string, unknown>) => ({ ...c, link_type: "search" }));
    },
  });
}
