import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveSupplierCode } from '@/types/supplier';
import type { DisplayOffer } from '@/components/suppliers/SupplierOffersTable';
import type { SupplierProductRow } from '@/components/suppliers/SupplierCatalogueTable';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

function supplierProductsKey(supplierId: string) {
  return ['supplier-products', supplierId] as const;
}

function supplierOffersKey(supplierId: string) {
  return ['supplier-offers', supplierId] as const;
}

function allProductsKey() {
  return ['products-list'] as const;
}

export function useSupplierProductsData(supplierId: string, supplierName: string) {
  const queryClient = useQueryClient();
  const supplierEnum = resolveSupplierCode(supplierName);

  // Fetch supplier_products (catalogue mapping)
  const {
    data: supplierProducts = [],
    isLoading: isLoadingProducts,
  } = useQuery({
    queryKey: supplierProductsKey(supplierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_products')
        .select('*, products(id, name, image_url, sku_interne, category, brand, ean)')
        .eq('supplier_id', supplierId);
      if (error) throw error;
      return (data ?? []) as SupplierProductRow[];
    },
    staleTime: 2 * 60_000,
  });

  // Fetch all products for the form dropdown
  const { data: products = [] } = useQuery({
    queryKey: allProductsKey(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    staleTime: 5 * 60_000,
  });

  // Fetch supplier_offers (imported offers)
  const {
    data: supplierOffers = [],
    isLoading: isLoadingOffers,
    error: offersError,
  } = useQuery({
    queryKey: supplierOffersKey(supplierId),
    queryFn: async () => {
      if (!supplierEnum) return [];
      const { data, error } = await supabase
        .from('supplier_offers')
        .select('id, supplier, supplier_product_id, product_id, purchase_price_ht, pvp_ttc, stock_qty, is_active, last_seen_at, products(id, name, sku_interne, category, brand, ean, image_url)')
        .eq('supplier', supplierEnum)
        .order('last_seen_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as DisplayOffer[]) ?? [];
    },
    staleTime: 2 * 60_000,
    enabled: !!supplierEnum,
  });

  // Create/Update supplier product mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id?: string;
      data: {
        product_id: string;
        supplier_reference: string | null;
        supplier_price: number;
        stock_quantity: number;
        lead_time_days: number;
        is_preferred: boolean;
        notes: string | null;
      };
    }) => {
      const payload = { supplier_id: supplierId, ...data };
      if (id) {
        const { error } = await supabase
          .from('supplier_products')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('supplier_products')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.id ? 'Produit fournisseur mis à jour' : 'Produit fournisseur ajouté');
      queryClient.invalidateQueries({ queryKey: supplierProductsKey(supplierId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  // Delete supplier product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supplier_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Produit fournisseur supprimé');
      queryClient.invalidateQueries({ queryKey: supplierProductsKey(supplierId) });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // Build fallback offers from supplier_products when no real offers exist
  const hasRealOffers = supplierOffers.length > 0;
  const fallbackOffers: DisplayOffer[] = supplierEnum && !hasRealOffers
    ? supplierProducts.map((sp) => ({
        id: `fallback-${sp.id}`,
        supplier: supplierEnum,
        supplier_product_id: sp.supplier_reference,
        product_id: sp.product_id,
        purchase_price_ht: sp.supplier_price ?? null,
        pvp_ttc: null as number | null,
        stock_qty: sp.stock_quantity ?? 0,
        is_active: true,
        last_seen_at: (sp as SupplierProductRow & { updated_at?: string }).updated_at ?? null,
        products: sp.products ? {
          id: sp.products.id,
          name: sp.products.name,
          sku_interne: sp.products.sku_interne ?? null,
          category: sp.products.category ?? null,
          brand: sp.products.brand ?? null,
          ean: sp.products.ean ?? null,
          image_url: sp.products.image_url ?? null,
        } : null,
      }))
    : [];

  const displayOffers = hasRealOffers ? supplierOffers : fallbackOffers;
  const usingFallbackOffers = !!supplierEnum && !hasRealOffers && fallbackOffers.length > 0;

  return {
    supplierProducts,
    supplierOffers: displayOffers,
    usingFallbackOffers,
    hasRealOffers,
    products,
    supplierEnum,
    isLoading: isLoadingProducts || isLoadingOffers,
    offersFetchError: offersError ? (offersError as Error).message : null,
    saveMutation,
    deleteMutation,
  };
}
