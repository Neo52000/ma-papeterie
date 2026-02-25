import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface B2BBudget {
  id: string;
  account_id: string;
  year: number;
  amount: number;
  spent_amount: number;
  alert_threshold_percent: number;
  created_at: string;
  updated_at: string;
}

// Helper: Supabase client typed as any for tables missing from generated types.
// Remove after running `supabase gen types typescript`.
const db = supabase as any;

export function useB2BBudget(accountId: string | undefined) {
  const currentYear = new Date().getFullYear();

  const { data: budget, isLoading } = useQuery({
    queryKey: ['b2b-budget', accountId, currentYear],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await db
        .from('b2b_budgets')
        .select('*')
        .eq('account_id', accountId!)
        .eq('year', currentYear)
        .maybeSingle();
      if (error) throw error;
      return data as B2BBudget | null;
    },
  });

  const remaining = budget ? budget.amount - budget.spent_amount : null;
  const percentUsed = budget && budget.amount > 0
    ? Math.round((budget.spent_amount / budget.amount) * 100)
    : 0;
  const isOverBudget = budget ? budget.spent_amount > budget.amount : false;
  const isNearAlert = budget
    ? percentUsed >= budget.alert_threshold_percent
    : false;

  return { budget, remaining, percentUsed, isOverBudget, isNearAlert, isLoading };
}

export function useB2BBudgetMutations() {
  const qc = useQueryClient();

  const upsertBudget = useMutation({
    mutationFn: async ({
      accountId,
      year,
      amount,
      alertThresholdPercent,
    }: {
      accountId: string;
      year: number;
      amount: number;
      alertThresholdPercent?: number;
    }) => {
      const { error } = await db.from('b2b_budgets').upsert({
        account_id: accountId,
        year,
        amount,
        alert_threshold_percent: alertThresholdPercent ?? 80,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_id,year' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['b2b-budget'] });
      toast.success('Budget mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour du budget'),
  });

  const updateSpent = useMutation({
    mutationFn: async ({ accountId, year, amount }: { accountId: string; year: number; amount: number }) => {
      const { error } = await db
        .from('b2b_budgets')
        .update({ spent_amount: amount, updated_at: new Date().toISOString() })
        .eq('account_id', accountId)
        .eq('year', year);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['b2b-budget'] }),
  });

  return { upsertBudget, updateSpent };
}
