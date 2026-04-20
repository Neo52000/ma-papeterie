import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePilotageStore } from '@/stores/pilotageStore';
import type {
  PilotageOverviewCurrent,
  PilotageSnapshot,
  TimeseriesPoint,
  TresorerieProjectionPoint,
  PilotageChannel,
} from '@/types/pilotage';

// -----------------------------------------------------------------------------
// Hook : vue d'ensemble (mv_pilotage_overview_current)
// -----------------------------------------------------------------------------
export function usePilotageOverview(channel?: PilotageChannel) {
  const storeChannel = usePilotageStore(s => s.channel);
  const resolvedChannel = channel ?? storeChannel;

  return useQuery({
    queryKey: ['pilotage', 'overview', resolvedChannel],
    queryFn: async (): Promise<PilotageOverviewCurrent | null> => {
      const { data, error } = await supabase
        .from('mv_pilotage_overview_current')
        .select('*')
        .eq('channel', resolvedChannel)
        .maybeSingle();
      if (error) throw error;
      return data as PilotageOverviewCurrent | null;
    },
    staleTime: 5 * 60_000, // MV refreshée 1x/jour, 5min suffisent
    gcTime: 10 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook : time-series pour charts (via RPC get_pilotage_timeseries)
// -----------------------------------------------------------------------------
export function usePilotageTimeseries(channel?: PilotageChannel) {
  const storeChannel = usePilotageStore(s => s.channel);
  const getResolvedDateRange = usePilotageStore(s => s.getResolvedDateRange);
  const { start, end } = getResolvedDateRange();
  const resolvedChannel = channel ?? storeChannel;

  return useQuery({
    queryKey: ['pilotage', 'timeseries', resolvedChannel, start, end],
    queryFn: async (): Promise<TimeseriesPoint[]> => {
      const { data, error } = await supabase.rpc('get_pilotage_timeseries', {
        p_start_date: start,
        p_end_date: end,
        p_channel: resolvedChannel,
      });
      if (error) throw error;
      return (data ?? []) as TimeseriesPoint[];
    },
    staleTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook : snapshots bruts (utile pour détail / audit)
// -----------------------------------------------------------------------------
export function usePilotageSnapshots(channel?: PilotageChannel, limit = 90) {
  const storeChannel = usePilotageStore(s => s.channel);
  const resolvedChannel = channel ?? storeChannel;

  return useQuery({
    queryKey: ['pilotage', 'snapshots', resolvedChannel, limit],
    queryFn: async (): Promise<PilotageSnapshot[]> => {
      const { data, error } = await supabase
        .from('pilotage_snapshots')
        .select('*')
        .eq('channel', resolvedChannel)
        .order('snapshot_date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PilotageSnapshot[];
    },
    staleTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook : projection de trésorerie
// -----------------------------------------------------------------------------
export function usePilotageTresorerieProjection() {
  return useQuery({
    queryKey: ['pilotage', 'tresorerie-projection'],
    queryFn: async (): Promise<TresorerieProjectionPoint[]> => {
      const { data, error } = await supabase
        .from('mv_pilotage_tresorerie_projection')
        .select('*')
        .order('encaissement_prevu_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TresorerieProjectionPoint[];
    },
    staleTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook : snapshot d'aujourd'hui (calcul à la demande via Edge Function)
// -----------------------------------------------------------------------------
export function useRecomputeSnapshot() {
  return async (targetDate?: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('pilotage-compute-kpi-snapshot', {
      body: { target_date: targetDate },
    });
    if (error) {
      console.error('[useRecomputeSnapshot] error:', error);
      return false;
    }
    return data?.success === true;
  };
}
