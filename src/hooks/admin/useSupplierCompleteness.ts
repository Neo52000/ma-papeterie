import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupplierMetrics {
  supplier: string;
  total_offers: number;
  total_products: number;
  pct_with_image: number;
  pct_with_description: number;
  pct_with_ean: number;
  pct_with_cost_price: number;
  pct_in_stock: number;
  pct_icecat_enriched: number;
  pct_with_seo: number;
  pct_with_brand: number;
  avg_completion: number;
}

export function useSupplierCompleteness() {
  return useQuery({
    queryKey: ['supplier-completeness'],
    queryFn: async (): Promise<SupplierMetrics[]> => {
      const { data, error } = await (supabase as unknown as SupabaseClient).rpc(
        'get_supplier_completeness'
      );
      if (error) throw error;
      return (data ?? []) as SupplierMetrics[];
    },
    staleTime: 5 * 60_000,
  });
}
