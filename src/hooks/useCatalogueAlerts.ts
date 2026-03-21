import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogueData } from "@/types/analytics";

export function useCatalogueAlerts() {
  return useQuery({
    queryKey: ["analytics-catalogue"],
    queryFn: async (): Promise<CatalogueData> => {
      const { data, error } = await supabase.functions.invoke(
        "analytics-catalogue",
      );
      if (error) throw new Error(error.message ?? "Erreur catalogue");
      if (data?.error) throw new Error(data.error);
      return data as CatalogueData;
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });
}
