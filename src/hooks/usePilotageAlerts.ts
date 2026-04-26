import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PilotageAlert, PilotageAlertRule, AlertStatus } from '@/types/pilotage';

// -----------------------------------------------------------------------------
// Hook : alertes actives
// -----------------------------------------------------------------------------
export function useActiveAlerts() {
  return useQuery({
    queryKey: ['pilotage', 'alerts', 'active'],
    queryFn: async (): Promise<PilotageAlert[]> => {
      const { data, error } = await supabase
        .from('pilotage_alerts')
        .select('*')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PilotageAlert[];
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // Vérification toutes les 5 min
  });
}

// -----------------------------------------------------------------------------
// Hook : historique complet des alertes
// -----------------------------------------------------------------------------
export function useAlertsHistory(limit = 100) {
  return useQuery({
    queryKey: ['pilotage', 'alerts', 'history', limit],
    queryFn: async (): Promise<PilotageAlert[]> => {
      const { data, error } = await supabase
        .from('pilotage_alerts')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PilotageAlert[];
    },
    staleTime: 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook : règles d'alerte configurées
// -----------------------------------------------------------------------------
export function useAlertRules() {
  return useQuery({
    queryKey: ['pilotage', 'alert-rules'],
    queryFn: async (): Promise<PilotageAlertRule[]> => {
      const { data, error } = await supabase
        .from('pilotage_alert_rules')
        .select('*')
        .order('severity', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PilotageAlertRule[];
    },
    staleTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// Mutation : changer le statut d'une alerte
// -----------------------------------------------------------------------------
export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ alertId, status }: { alertId: string; status: AlertStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from('pilotage_alerts')
        .update(updates)
        .eq('id', alertId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'alerts'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Mutation : activer / désactiver une règle
// -----------------------------------------------------------------------------
export function useToggleAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('pilotage_alert_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'alert-rules'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Trigger manuel de détection
// -----------------------------------------------------------------------------
export function useRunAlertDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detect-alerts', { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'alerts'] });
    },
  });
}
