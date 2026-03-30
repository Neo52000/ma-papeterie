import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";

export function useRecomputeRollups(productId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("product_id requis");
      const { data, error } = await (supabase as unknown as SupabaseClient).rpc('admin_recompute_product_rollups', {
        p_product_id: productId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-offers', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rollup', productId] });
      toast.success(`Prix public : ${data?.public_price_ttc ? `${Number(data.public_price_ttc).toFixed(2)} \u20ac (${data.public_price_source})` : 'non disponible'} \u00b7 Stock : ${data?.available_qty_total ?? 0}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
