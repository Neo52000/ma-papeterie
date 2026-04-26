import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/authStore';
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
  // Enrichissement SIRENE (migration 20260421120000)
  siren?: string | null;
  naf_code?: string | null;
  naf_label?: string | null;
  legal_form?: string | null;
  founded_date?: string | null;
  employee_range?: string | null;
  sirene_raw?: unknown;
  sirene_synced_at?: string | null;
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

// Helper: Supabase client typed as any for tables missing from generated types.
// Remove after running `supabase gen types typescript`.
const db = supabase as unknown as SupabaseClient;

export function useB2BAccount() {
  const { user } = useAuth();

  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['b2b-membership', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
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
      const { data, error } = await db
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
      const { data, error } = await db
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
      const { error } = await db
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

  /**
   * Re-synchronise les colonnes SIRENE d'un compte B2B depuis data.gouv.
   * Nécessite un `siret` valide 14 chiffres sur le compte.
   */
  const syncFromSirene = useMutation({
    mutationFn: async (accountId: string) => {
      const { data: account, error: fetchError } = await db
        .from('b2b_accounts')
        .select('id, siret')
        .eq('id', accountId)
        .single();
      if (fetchError) throw fetchError;
      const siret = (account as { siret: string | null } | null)?.siret?.replace(/\s/g, '') ?? '';
      if (!/^\d{14}$/.test(siret)) {
        throw new Error('Le compte n\'a pas de SIRET valide (14 chiffres) — impossible de synchroniser.');
      }

      const { data, error } = await supabase.functions.invoke<{
        results: Array<{
          siret: string;
          siren: string;
          name: string;
          nafCode: string | null;
          nafLabel: string | null;
          legalForm: string | null;
          foundedDate: string | null;
          employeeRange: string | null;
          raw: unknown;
        }>;
      }>('recherche-entreprises-search', {
        body: { query: siret, mode: 'siret', limit: 1 },
      });
      if (error) throw new Error(error.message || 'Erreur proxy SIRENE');
      const first = data?.results?.[0];
      if (!first) {
        throw new Error('Aucune entreprise trouvée à l\'INSEE pour ce SIRET.');
      }

      const { error: updateError } = await db
        .from('b2b_accounts')
        .update({
          naf_code: first.nafCode,
          naf_label: first.nafLabel,
          legal_form: first.legalForm,
          founded_date: first.foundedDate,
          employee_range: first.employeeRange,
          sirene_raw: first.raw,
          sirene_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);
      if (updateError) throw updateError;
      return first;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['b2b-account'] });
      qc.invalidateQueries({ queryKey: ['b2b-membership'] });
      qc.invalidateQueries({ queryKey: ['b2b-all-accounts'] });
      toast.success('Données SIRENE mises à jour');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Erreur de synchronisation SIRENE'),
  });

  return { updateAccount, syncFromSirene };
}

// Admin-only: liste tous les comptes
export function useAllB2BAccounts() {
  return useQuery({
    queryKey: ['b2b-all-accounts'],
    queryFn: async () => {
      const { data, error } = await db
        .from('b2b_accounts')
        .select('*, b2b_price_grids(name)')
        .order('name');
      if (error) throw error;
      return data as (B2BAccount & { b2b_price_grids: { name: string } | null })[];
    },
  });
}
