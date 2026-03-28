import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_ttc: number | null;
  image_url: string | null;
  category: string;
  subcategory: string | null;
  badge: string | null;
  eco: boolean;
  stock_quantity: number;
  is_featured: boolean;
  ean: string | null;
  brand: string | null;
}

export const useProducts = (featured?: boolean) => {
  const { data: products = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['products', { featured }],
    queryFn: async () => {
      let query = supabase.from('products').select('id, name, description, price, price_ht, price_ttc, image_url, category, stock_quantity, badge, is_active, is_featured, brand, ean');

      if (featured) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Product[];
    },
    staleTime: 2 * 60_000,   // 2min — données dynamiques
    gcTime: 5 * 60_000,
  });

  return { products, loading, error: error?.message ?? null, refetch };
};