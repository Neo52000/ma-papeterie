import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SupplierOffer {
  id: string;
  product_id: string;
  supplier: 'ALKOR' | 'COMLANDI' | 'SOFT';
  supplier_product_id: string;
  pvp_ttc: number | null;
  purchase_price_ht: number | null;
  vat_rate: number | null;
  tax_breakdown: Record<string, number> | null;
  stock_qty: number;
  delivery_delay_days: number | null;
  min_qty: number;
  packaging: Record<string, unknown> | null;
  is_active: boolean;
  last_seen_at: string;
  updated_at: string;
  created_at: string;
}

export function useSupplierOffers(productId: string | undefined, ean?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['supplier-offers', productId, ean],
    queryFn: async () => {
      if (!productId) return [];

      // Step 1: direct offers for this product
      const { data: directData, error } = await supabase
        .from('supplier_offers' as any)
        .select('*')
        .eq('product_id', productId)
        .order('supplier', { ascending: true });
      if (error) throw error;

      let allOffers = (directData ?? []) as unknown as SupplierOffer[];

      // Step 2: cross-reference by EAN — find offers linked to other products sharing the same EAN
      if (ean) {
        const { data: sameEanProducts } = await supabase
          .from('products')
          .select('id')
          .eq('ean', ean)
          .neq('id', productId);

        if (sameEanProducts && sameEanProducts.length > 0) {
          const otherIds = sameEanProducts.map((p: any) => p.id);
          const { data: eanOffers } = await supabase
            .from('supplier_offers' as any)
            .select('*')
            .in('product_id', otherIds);

          if (eanOffers) {
            const existingIds = new Set(allOffers.map(o => o.id));
            for (const offer of eanOffers as unknown as SupplierOffer[]) {
              if (!existingIds.has(offer.id)) {
                allOffers.push(offer);
              }
            }
          }
        }
      }

      // Sort by supplier name
      allOffers.sort((a, b) => a.supplier.localeCompare(b.supplier));
      return allOffers;
    },
    enabled: !!productId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ offerId, isActive }: { offerId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('supplier_offers' as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-offers', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rollup', productId] });
      toast({ title: "Offre mise à jour", description: "Statut modifié avec succès." });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  return {
    offers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    toggleOfferActive: (offerId: string, isActive: boolean) =>
      toggleMutation.mutate({ offerId, isActive }),
    isToggling: toggleMutation.isPending,
  };
}
