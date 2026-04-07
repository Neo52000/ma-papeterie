import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SupplierOffer {
  id: string;
  product_id: string;
  supplier: string;
  supplier_product_id: string | null;
  pvp_ttc: number | null;
  purchase_price_ht: number | null;
  vat_rate: number | null;
  stock_qty: number | null;
  delivery_delay_days: number | null;
  min_qty: number | null;
  is_active: boolean;
  is_preferred?: boolean;
  priority_rank?: number | null;
  last_seen_at: string | null;
  updated_at: string | null;
}

function productOffersKey(productId: string) {
  return ['product-offers', productId] as const;
}

/**
 * Fetch all supplier offers for a product from the supplier_offers table.
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
        .from('supplier_offers' as any) as any)
        .select('*')
        .eq('product_id', productId!)
        .order('purchase_price_ht', { ascending: true, nullsFirst: false });
      if (err) throw err;
      return (data ?? []) as unknown as SupplierOffer[];
    },
    enabled: !!productId,
    staleTime: 2 * 60_000,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ offerId, isActive }: { offerId: string; isActive: boolean }) => {
      const { error: err } = await (supabase
        .from('supplier_offers' as any) as any)
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
      // supplier_offers doesn't have is_preferred — update supplier_products instead
      const offer = offers.find(o => o.id === offerId);
      if (!offer) return;
      const { error: err } = await (supabase
        .from('supplier_products' as any) as any)
        .update({ is_preferred: isPreferred })
        .eq('product_id', offer.product_id)
        .ilike('supplier_reference', offer.supplier_product_id ?? '');
      if (err) throw err;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productOffersKey(productId ?? '') });
    },
  });

  const setPriorityRank = useMutation({
    mutationFn: async ({ offerId, rank }: { offerId: string; rank: number | null }) => {
      const offer = offers.find(o => o.id === offerId);
      if (!offer) return;
      const { error: err } = await (supabase
        .from('supplier_products' as any) as any)
        .update({ priority_rank: rank })
        .eq('product_id', offer.product_id)
        .ilike('supplier_reference', offer.supplier_product_id ?? '');
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
    setPriorityRank,
  };
}
