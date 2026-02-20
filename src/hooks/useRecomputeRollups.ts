import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useRecomputeRollups(productId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("product_id requis");
      const { data, error } = await supabase.rpc('admin_recompute_product_rollups' as any, {
        p_product_id: productId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-offers', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rollup', productId] });
      toast({
        title: "Rollups recalculés",
        description: `Prix public : ${data?.public_price_ttc ? `${Number(data.public_price_ttc).toFixed(2)} € (${data.public_price_source})` : 'non disponible'} · Stock : ${data?.available_qty_total ?? 0}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur de recalcul", description: err.message, variant: "destructive" });
    },
  });
}
