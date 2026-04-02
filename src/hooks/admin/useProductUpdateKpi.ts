import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupplierDailyUpdate {
  supplier_code: string;
  supplier_name: string;
  stock_changes: number;
  new_articles: number;
  deactivated: number;
  price_changes: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useProductUpdateKpi() {
  const targetDate = todayISO();

  return useQuery({
    queryKey: ['product-update-kpi', targetDate],
    queryFn: async () => {
      // RPC pas encore dans les types auto-générés
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client.rpc('get_daily_product_updates', {
        target_date: targetDate,
      });

      if (error) throw error;
      return (data ?? []) as SupplierDailyUpdate[];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
