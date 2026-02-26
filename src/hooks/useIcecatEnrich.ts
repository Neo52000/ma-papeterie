import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IcecatStats {
  total_with_ean: number;
  enriched: number;
  not_enriched: number;
  enriched_pct: number;
  last_enriched_at: string | null;
}

export function useIcecatStats() {
  return useQuery<IcecatStats>({
    queryKey: ["icecat-stats"],
    queryFn: async () => {
      const { count: totalWithEan } = await (supabase as any)
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("ean", "is", null);

      const { count: enriched } = await (supabase as any)
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("ean", "is", null)
        .not("icecat_enriched_at", "is", null);

      const { data: lastRow } = await (supabase as any)
        .from("products")
        .select("icecat_enriched_at")
        .not("icecat_enriched_at", "is", null)
        .order("icecat_enriched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const total = totalWithEan ?? 0;
      const done = enriched ?? 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        total_with_ean: total,
        enriched: done,
        not_enriched: total - done,
        enriched_pct: pct,
        last_enriched_at: lastRow?.icecat_enriched_at ?? null,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useIcecatSampleProducts(productLimit = 20) {
  return useQuery({
    queryKey: ["icecat-sample", productLimit],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select(
          "id, name, ean, brand, icecat_id, icecat_enriched_at, icecat_title, specifications",
        )
        .not("ean", "is", null)
        .not("icecat_enriched_at", "is", null)
        .not("icecat_id", "is", null)
        .order("icecat_enriched_at", { ascending: false })
        .limit(productLimit);
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
