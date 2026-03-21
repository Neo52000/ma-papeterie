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
      if (error) {
        // Extract real error message from FunctionsHttpError response body
        let msg = "Erreur lors de la récupération des données Shopify";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {
          if (
            error.message &&
            error.message !== "Edge Function returned a non-2xx status code"
          ) {
            msg = error.message;
          }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data as RevenueData;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
