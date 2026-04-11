import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BestOffer } from '@/types/supplier';

/**
 * Returns the single best supplier offer for a product using
 * the `v_best_offers` database view.
 *
 * Priority: is_preferred DESC → priority_rank ASC → purchase_price_ht ASC
 */
export function useBestOffer(productId: string | undefined) {
  const {
    data: bestOffer = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['best-offer', productId ?? ''],
    queryFn: async () => {
      const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };
      const { data, error: err } = await db
        .from('v_best_offers')
        .select('*')
        .eq('product_id', productId!)
        .maybeSingle();
      if (err) throw err;
      return (data as unknown as BestOffer) ?? null;
    },
    enabled: !!productId,
    staleTime: 2 * 60_000,
  });

  return {
    bestOffer,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
