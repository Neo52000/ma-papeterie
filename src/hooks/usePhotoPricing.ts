import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PHOTO_PRICES, type PhotoPriceEntry } from '@/components/photos/photoPricing';
// Helper: cast supabase to bypass stale generated types for tables not yet in the schema.
const db: any = supabase;

export function usePhotoPricing() {
  return useQuery<PhotoPriceEntry[]>({
    queryKey: ['photo-pricing'],
    queryFn: async (): Promise<PhotoPriceEntry[]> => {
      const { data, error } = await db
        .from('photo_pricing')
        .select('format, label, price_per_unit')
        .eq('active', true)
        .order('price_per_unit', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_PHOTO_PRICES;
      }

      return (data as unknown[]).map(row => {
        const r = row as Record<string, unknown>;
        return {
          format: r.format,
          label: r.label as string,
          price_per_unit: Number(r.price_per_unit),
        } as PhotoPriceEntry;
      });
    },
    staleTime: 10 * 60 * 1000,
  });
}
