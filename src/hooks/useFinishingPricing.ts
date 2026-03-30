import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_FINISHING_PRICES, type FinishingPriceEntry } from '@/components/print/printPricing';
// Helper: cast supabase to bypass stale generated types for tables not yet in the schema.
const db: any = supabase;

export function useFinishingPricing() {
  return useQuery<FinishingPriceEntry[]>({
    queryKey: ['finishing-pricing'],
    queryFn: async (): Promise<FinishingPriceEntry[]> => {
      const { data, error } = await db
        .from('finishing_pricing')
        .select('finishing, label, price, per_page')
        .eq('active', true);

      if (error || !data || data.length === 0) {
        return DEFAULT_FINISHING_PRICES;
      }

      return (data as unknown[]).map(row => {
        const r = row as Record<string, unknown>;
        return {
          finishing: r.finishing,
          label: r.label as string,
          price: Number(r.price),
          per_page: Boolean(r.per_page),
        } as FinishingPriceEntry;
      });
    },
    staleTime: 10 * 60 * 1000,
  });
}
