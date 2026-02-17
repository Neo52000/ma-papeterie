import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      const { data: result, error: fnError } = await supabase.functions.invoke('softcarrier-live-price', {
        body: null,
        headers: {},
      });

      // Use GET via query params - invoke doesn't support GET params well, so use fetch
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/softcarrier-live-price?ref=${encodeURIComponent(ref)}&qty=${qty}`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });

      if (!response.ok) throw new Error(await response.text());
      const json = await response.json();
      setData(json);
      return json;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchLivePrice, loading, data, error };
};
