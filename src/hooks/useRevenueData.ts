import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RevenueData, RevenuePeriod } from "@/types/analytics";

export function useRevenueData(period: RevenuePeriod = "month") {
  return useQuery({
    queryKey: ["analytics-revenue", period],
    queryFn: async (): Promise<RevenueData> => {
      const { data, error } = await supabase.functions.invoke(
        "analytics-shopify",
        { body: { period, compare: true } },
      );
      if (error) throw new Error(error.message ?? "Erreur Shopify");
      if (data?.error) throw new Error(data.error);
      return data as RevenueData;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
