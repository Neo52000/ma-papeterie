import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceType } from '@/lib/serviceConfig';

const db = supabase as unknown as SupabaseClient;

const DEFAULT_PRINT_PRICES: Record<string, number> = {
  'A4|nb': 0.08,       // HT
  'A4|couleur': 0.42,
  'A3|nb': 0.17,
  'A3|couleur': 0.83,
};

const DEFAULT_PHOTO_PRICES: Record<string, number> = {
  '10x15': 0.13,  // HT
  '13x18': 0.25,
  '15x20': 0.42,
  '20x30': 1.67,
  '30x45': 4.17,
};

export function useServicePricing(serviceType: ServiceType) {
  const { data: printPrices } = useQuery({
    queryKey: ['print-pricing-ht'],
    queryFn: async () => {
      const { data, error } = await db
        .from('print_pricing')
        .select('format, color, price_per_page')
        .eq('active', true);

      if (error || !data || data.length === 0) return null;

      const map: Record<string, number> = {};
      for (const row of (data as Array<{ format: string; color: string; price_per_page: number }>)) {
        // Prices in DB are TTC, convert to HT
        const ttc = Number(row.price_per_page);
        const ht = Math.round((ttc / 1.20) * 100) / 100;
        map[`${row.format}|${row.color}`] = ht;
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
    enabled: serviceType === 'reprographie',
  });

  const { data: photoPrices } = useQuery({
    queryKey: ['photo-pricing-ht'],
    queryFn: async () => {
      const { data, error } = await db
        .from('photo_pricing')
        .select('format, price_per_unit')
        .eq('active', true);

      if (error || !data || data.length === 0) return null;

      const map: Record<string, number> = {};
      for (const row of (data as Array<{ format: string; price_per_unit: number }>)) {
        // Prices in DB are TTC, convert to HT
        const ttc = Number(row.price_per_unit);
        const ht = Math.round((ttc / 1.20) * 100) / 100;
        map[row.format] = ht;
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
    enabled: serviceType === 'photo',
  });

  const unitPricesHt = useMemo(() => {
    if (serviceType === 'reprographie') {
      return printPrices ?? DEFAULT_PRINT_PRICES;
    }
    return photoPrices ?? DEFAULT_PHOTO_PRICES;
  }, [serviceType, printPrices, photoPrices]);

  return { unitPricesHt };
}
