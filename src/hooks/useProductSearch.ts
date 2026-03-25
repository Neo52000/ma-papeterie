import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SearchResult {
  id: string;
  slug: string | null;
  name: string;
  price_ht: number | null;
  price_ttc: number | null;
  image_url: string | null;
  category: string;
  brand: string | null;
  eco: boolean | null;
  stock_quantity: number | null;
}

/**
 * Search products via the search_products RPC function (pg_trgm).
 * Falls back to ILIKE if the RPC is not yet deployed.
 */
export function useProductSearch(query: string, limit: number = 8) {
  return useQuery({
    queryKey: ["product-search", query, limit],
    enabled: query.length >= 2,
    staleTime: 2 * 60_000,
    queryFn: async (): Promise<SearchResult[]> => {
      // Try the RPC first
      const { data: rpcData, error: rpcError } = await (supabase as unknown as SupabaseClient).rpc(
        "search_products",
        { query, lim: limit }
      );

      if (!rpcError && rpcData) {
        return rpcData as SearchResult[];
      }

      // Fallback: simple ILIKE query if RPC not available
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price_ht, price_ttc, image_url, category, brand, eco, stock_quantity")
        .eq("is_active", true)
        .or(`name.ilike.%${query}%,ean.ilike.%${query}%,brand.ilike.%${query}%,manufacturer_code.ilike.%${query}%`)
        .or(`name.ilike.%${query}%,ean.ilike.%${query}%,brand.ilike.%${query}%,manufacturer_code.ilike.%${query}%,manufacturer_ref.ilike.%${query}%`)
        .order("name")
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
  });
}
