import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface B2BAccount {
  id: string;
  name: string;
  siret: string | null;
  vat_number: string | null;
  phone: string | null;
  email: string | null;
  billing_address: Record<string, string> | null;
  payment_terms: number;
  price_grid_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface B2BCompanyUser {
  id: string;
  account_id: string;
  user_id: string;
  role: 'admin' | 'member';
  is_primary: boolean;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

export function useB2BAccount() {
  const { user } = useAuth();

  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['b2b-membership', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_company_users')
        .select('*, b2b_accounts(*)')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as (B2BCompanyUser & { b2b_accounts: B2BAccount }) | null;
    },
  });

  const account = membership?.b2b_accounts ?? null;
  const isB2BMember = !!account;
  const isB2BAdmin = membership?.role === 'admin';

  return { account, membership, isB2BMember, isB2BAdmin, isLoading: membershipLoading };
}

export function useB2BAccountById(accountId: string | undefined) {
  return useQuery({
    queryKey: ['b2b-account', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_accounts')
        .select('*')
        .eq('id', accountId!)
        .single();
      if (error) throw error;
      return data as B2BAccount;
    },
  });
}

export function useB2BCompanyUsers(accountId: string | undefined) {
  return useQuery({
    queryKey: ['b2b-company-users', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_company_users')
        .select('*, profiles(display_name, avatar_url)')
        .eq('account_id', accountId!);
      if (error) throw error;
      return data as B2BCompanyUser[];
    },
  });
}

export function useB2BAccountMutations() {
  const qc = useQueryClient();

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<B2BAccount> & { id: string }) => {
      const { error } = await supabase
        .from('b2b_accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['b2b-account'] });
      qc.invalidateQueries({ queryKey: ['b2b-membership'] });
      toast.success('Informations mises à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  return { updateAccount };
}

// Admin-only: liste tous les comptes
export function useAllB2BAccounts() {
  return useQuery({
    queryKey: ['b2b-all-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('b2b_accounts')
        .select('*, b2b_price_grids(name)')
        .order('name');
      if (error) throw error;
      return data as (B2BAccount & { b2b_price_grids: { name: string } | null })[];
    },
  });
}
