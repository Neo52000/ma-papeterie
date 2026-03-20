import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_FINISHING_PRICES, type FinishingPriceEntry } from '@/components/print/printPricing';

export function useFinishingPricing() {
  return useQuery<FinishingPriceEntry[]>({
    queryKey: ['finishing-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finishing_pricing' as any)
        .select('finishing, label, price, per_page')
        .eq('active', true);

      if (error || !data || data.length === 0) {
        return DEFAULT_FINISHING_PRICES;
      }

      return (data as any[]).map(row => ({
        finishing: row.finishing,
        label: row.label,
        price: Number(row.price),
        per_page: Boolean(row.per_page),
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}
