import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KpiSnapshot {
  week_start: string;
  sessions: number;
  organic_sessions: number;
  orders: number;
  revenue_ttc: number;
  aov: number;
  conversion_rate: number;
  cart_abandonment_rate: number;
  school_list_uploads: number;
  school_list_conversion_rate: number;
  new_customers: number;
  returning_customers: number;
  shopify_sync_errors: number;
  avg_margin_rate: number;
}

export interface KpiDelta {
  value: number;
  delta: number;
  deltaPercent: number;
  trend: 'up' | 'down' | 'stable';
}

function computeDelta(current: number, previous: number): KpiDelta {
  const delta = current - previous;
  const deltaPercent = previous !== 0 ? (delta / previous) * 100 : 0;
  return {
    value: current,
    delta,
    deltaPercent,
    trend: deltaPercent > 1 ? 'up' : deltaPercent < -1 ? 'down' : 'stable',
  };
}

export function useKpiDashboard() {
  return useQuery({
    queryKey: ['kpi-dashboard'],
    queryFn: async () => {
      // kpi_snapshots n'est pas encore dans les types auto-générés
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from('kpi_snapshots')
        .select('*')
        .order('week_start', { ascending: true })
        .limit(12);

      if (error) throw error;

      const snapshots = (data ?? []) as KpiSnapshot[];
      const current = snapshots[snapshots.length - 1];
      const previous = snapshots[snapshots.length - 2];

      if (!current) return { snapshots, current: null, deltas: null };

      const deltas = {
        revenue: computeDelta(current.revenue_ttc, previous?.revenue_ttc ?? 0),
        orders: computeDelta(current.orders, previous?.orders ?? 0),
        aov: computeDelta(current.aov, previous?.aov ?? 0),
        conversion: computeDelta(current.conversion_rate * 100, (previous?.conversion_rate ?? 0) * 100),
        sessions: computeDelta(current.sessions, previous?.sessions ?? 0),
        margin: computeDelta(current.avg_margin_rate * 100, (previous?.avg_margin_rate ?? 0) * 100),
        schoolList: computeDelta(current.school_list_uploads, previous?.school_list_uploads ?? 0),
        newCustomers: computeDelta(current.new_customers, previous?.new_customers ?? 0),
      };

      return { snapshots, current, deltas };
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}
