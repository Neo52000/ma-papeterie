import { useState, useCallback } from 'react';
import { SUPABASE_PROJECT_URL } from '@/integrations/supabase/client';
import { env } from '@/config/env';

interface LivePriceResult {
  ref_softcarrier: string;
  price_ht: number;
  qty_available: number;
  delivery_days: number;
  delivery_week: string | null;
  cached: boolean;
  fetched_at: string;
}

export const useLivePrice = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LivePriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLivePrice = useCallback(async (ref: string, qty = 1) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${SUPABASE_PROJECT_URL}/functions/v1/softcarrier-live-price?ref=${encodeURIComponent(ref)}&qty=${qty}`;

      const response = await fetch(url, {
        headers: {
          'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) throw new Error(await response.text());
      const json = await response.json();
      setData(json);
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchLivePrice, loading, data, error };
};
