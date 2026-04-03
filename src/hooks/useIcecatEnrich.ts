import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Helper: cast supabase to bypass stale generated types for columns not yet in the schema.
const db = supabase as unknown as SupabaseClient;

export interface IcecatStats {
  total_with_ean: number;
  enriched: number;
  not_enriched: number;
  not_found: number;
  enriched_pct: number;
  last_enriched_at: string | null;
}

export function useIcecatStats() {
  return useQuery<IcecatStats>({
    queryKey: ["icecat-stats"],
    queryFn: async () => {
      const { count: totalWithEan, error: e1 } = await db
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("ean", "is", null);
      if (e1) throw new Error(`Stats query failed: ${e1.message}`);

      const { count: enriched, error: e2 } = await db
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("ean", "is", null)
        .not("icecat_enriched_at", "is", null);
      if (e2) throw new Error(`Enriched count query failed: ${e2.message}`);

      const { count: notFoundCount, error: e3 } = await db
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("ean", "is", null)
        .not("icecat_enriched_at", "is", null)
        .is("icecat_id", null);
      if (e3) throw new Error(`Not-found count query failed: ${e3.message}`);

      const { data: lastRow, error: e4 } = await db
        .from("products")
        .select("icecat_enriched_at")
        .not("icecat_enriched_at", "is", null)
        .order("icecat_enriched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (e4) throw new Error(`Last enriched query failed: ${e4.message}`);

      const total = totalWithEan ?? 0;
      const done = enriched ?? 0;
      const notFound = notFoundCount ?? 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        total_with_ean: total,
        enriched: done,
        not_enriched: total - done,
        not_found: notFound,
        enriched_pct: pct,
        last_enriched_at: (lastRow as Record<string, unknown> | null)?.icecat_enriched_at as string | null ?? null,
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
      const { data, error } = await db
        .from("products")
        .select(
          "id, name, ean, brand, icecat_id, icecat_enriched_at, icecat_title, specifications",
        )
        .not("ean", "is", null)
        .not("icecat_enriched_at", "is", null)
        .order("icecat_enriched_at", { ascending: false })
        .limit(productLimit);
      if (error) throw new Error(`Sample query failed: ${error.message}`);
      return data ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
