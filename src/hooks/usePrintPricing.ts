import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PRICES, type PrintPriceEntry } from '@/components/print/printPricing';

const db = supabase as unknown as SupabaseClient;

export function usePrintPricing() {
  return useQuery<PrintPriceEntry[]>({
    queryKey: ['print-pricing'],
    queryFn: async () => {
      const { data, error } = await db
        .from('print_pricing')
        .select('format, color, price_per_page')
        .eq('active', true);

      if (error || !data || data.length === 0) {
        return DEFAULT_PRICES;
      }

      return (data as Array<{ format: string; color: string; price_per_page: number }>).map(row => ({
        format: row.format,
        color: row.color,
        price_per_page: Number(row.price_per_page),
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}
