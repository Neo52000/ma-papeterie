import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EnrichParams {
  product_ids?: string[];
  ean?: string;
  limit?: number;
  force?: boolean;
}

export interface EnrichResultItem {
  product_id: string;
  status: "enriched" | "not_found" | "error";
  icecat_id?: number;
  error?: string;
}

export interface EnrichResponse {
  success: boolean;
  total: number;
  enriched: number;
  not_found: number;
  errors: number;
  results: EnrichResultItem[];
}

export function useIcecatEnrichMutation() {
  const queryClient = useQueryClient();
  return useMutation<EnrichResponse, Error, EnrichParams>({
    mutationFn: async (params) => {
      const { data, error } = await supabase.functions.invoke("icecat-enrich", {
        body: params,
      });
      if (error) {
        // Try to extract the real error message from the response
        const msg = typeof data === "object" && data?.error
          ? data.error
          : error.message || "Erreur Edge Function";
        throw new Error(msg);
      }
      return data as EnrichResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["icecat-stats"] });
      queryClient.invalidateQueries({ queryKey: ["icecat-sample"] });
    },
  });
}
