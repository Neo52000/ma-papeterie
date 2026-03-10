import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches active product counts grouped by category.
 * Returns a Map<categoryName, count>.
 */
export function useCategoryCounts() {
  return useQuery({
    queryKey: ["category-counts"],
    staleTime: 10 * 60_000, // 10 minutes
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("is_active", true);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
      }
      return counts;
    },
  });
}
