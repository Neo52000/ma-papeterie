import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CatalogItem } from '@/types/supplier';

function productOffersKey(productId: string) {
  return ['product-offers', productId] as const;
}

/**
 * Fetch all supplier offers for a product using the unified
 * `v_product_all_offers` view.  Cross-EAN matching is handled
 * server-side so the client gets a flat list in one query.
 */
export function useProductOffers(productId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: offers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: productOffersKey(productId ?? ''),
    queryFn: async () => {
      const { data, error: err } = await (supabase
        .from('v_product_all_offers' as any) as any)
        .select('*')
        .eq('product_id', productId!)
        .order('is_preferred', { ascending: false })
        .order('priority_rank', { ascending: true, nullsFirst: false })
        .order('purchase_price_ht', { ascending: true, nullsFirst: false });
      if (err) throw err;
      return (data ?? []) as unknown as CatalogItem[];
    },
    enabled: !!productId,
    staleTime: 2 * 60_000,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ offerId, isActive }: { offerId: string; isActive: boolean }) => {
      const { error: err } = await (supabase
        .from('supplier_catalog_items' as any) as any)
        .update({ is_active: isActive })
        .eq('id', offerId);
      if (err) throw err;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productOffersKey(productId ?? '') });
    },
  });

  const setPreferred = useMutation({
    mutationFn: async ({ offerId, isPreferred }: { offerId: string; isPreferred: boolean }) => {
      const { error: err } = await (supabase
        .from('supplier_catalog_items' as any) as any)
        .update({ is_preferred: isPreferred })
        .eq('id', offerId);
      if (err) throw err;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productOffersKey(productId ?? '') });
    },
  });

  return {
    offers,
    isLoading,
    error: error ? (error as Error).message : null,
    toggleActive,
    setPreferred,
  };
}
