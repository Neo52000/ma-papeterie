import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PHOTO_PRICES, type PhotoPriceEntry } from '@/components/photos/photoPricing';

export function usePhotoPricing() {
  return useQuery<PhotoPriceEntry[]>({
    queryKey: ['photo-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photo_pricing' as any)
        .select('format, label, price_per_unit')
        .eq('active', true)
        .order('price_per_unit', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_PHOTO_PRICES;
      }

      return (data as any[]).map(row => ({
        format: row.format,
        label: row.label,
        price_per_unit: Number(row.price_per_unit),
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}
