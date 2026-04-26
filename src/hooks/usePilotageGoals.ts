import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PilotageGoal, GoalProgress, PilotagePeriod } from '@/types/pilotage';

// -----------------------------------------------------------------------------
// Hook : liste des objectifs
// -----------------------------------------------------------------------------
export function usePilotageGoals(period?: PilotagePeriod) {
  return useQuery({
    queryKey: ['pilotage', 'goals', period ?? 'all'],
    queryFn: async (): Promise<PilotageGoal[]> => {
      let query = supabase
        .from('pilotage_goals')
        .select('*')
        .order('period_start', { ascending: false });
      if (period) query = query.eq('period', period);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PilotageGoal[];
    },
    staleTime: 60_000,
  });
}

// -----------------------------------------------------------------------------
// Hook : progression d'un objectif (via RPC get_goal_progress)
// -----------------------------------------------------------------------------
export function useGoalProgress(period: PilotagePeriod = 'month', date?: string) {
  return useQuery({
    queryKey: ['pilotage', 'goal-progress', period, date],
    queryFn: async (): Promise<GoalProgress[]> => {
      const { data, error } = await supabase.rpc('get_goal_progress', {
        p_period: period,
        p_date: date ?? new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      return (data ?? []) as GoalProgress[];
    },
    staleTime: 5 * 60_000,
  });
}

// -----------------------------------------------------------------------------
// Mutation : créer / mettre à jour un objectif
// -----------------------------------------------------------------------------
export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: Partial<PilotageGoal> & { period: PilotagePeriod; period_start: string; period_end: string }) => {
      const { data, error } = await supabase
        .from('pilotage_goals')
        .upsert(goal, { onConflict: 'period,period_start,channel' })
        .select()
        .single();
      if (error) throw error;
      return data as PilotageGoal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'goals'] });
      qc.invalidateQueries({ queryKey: ['pilotage', 'goal-progress'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Mutation : supprimer un objectif
// -----------------------------------------------------------------------------
export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from('pilotage_goals').delete().eq('id', goalId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'goals'] });
      qc.invalidateQueries({ queryKey: ['pilotage', 'goal-progress'] });
    },
  });
}
