import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PriceHistoryEntry {
  id: string;
  changed_at: string;
  changed_by: string;
  old_cost_price: number | null;
  new_cost_price: number | null;
  old_price_ht: number | null;
  new_price_ht: number | null;
  old_price_ttc: number | null;
  new_price_ttc: number | null;
  change_reason: string | null;
  supplier_id: string | null;
}

export interface LifecycleEvent {
  id: string;
  event_type: string;
  event_at: string;
  performed_by: string;
  details: Record<string, any>;
}

export const useProductHistory = (productId: string | null) => {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [lifecycleEvents, setLifecycleEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    fetchHistory();
  }, [productId]);

  const fetchHistory = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [priceRes, lifecycleRes] = await Promise.all([
        supabase
          .from('product_price_history')
          .select('*')
          .eq('product_id', productId)
          .order('changed_at', { ascending: false })
          .limit(50),
        supabase
          .from('product_lifecycle_logs')
          .select('*')
          .eq('product_id', productId)
          .order('event_at', { ascending: false })
          .limit(50),
      ]);
      setPriceHistory((priceRes.data as any) || []);
      setLifecycleEvents((lifecycleRes.data as any) || []);
    } catch (err) {
      console.error('Error fetching product history:', err);
    } finally {
      setLoading(false);
    }
  };

  return { priceHistory, lifecycleEvents, loading, refetch: fetchHistory };
};
