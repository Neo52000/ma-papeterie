import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Admin2FAStatus {
  id: string;
  totp_enabled: boolean;
  backup_codes: string[];
}

// Helper: cast supabase to bypass stale generated types for tables/functions
// not yet present in the auto-generated types file.
const sb = supabase as unknown as SupabaseClient;

/**
 * Fetch current user's 2FA status
 */
export function use2FAStatus() {
  return useQuery({
    queryKey: ['admin-2fa-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await sb
        .from('admin_users')
        .select('id, totp_enabled, backup_codes')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      return (data as Admin2FAStatus | null) || { id: user.id, totp_enabled: false, backup_codes: [] };
    },
  });
}

/**
 * Generate TOTP secret (first step of 2FA setup)
 */
export function useGenerateTOTPSecret() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await sb
        .rpc('generate_totp_secret');

      if (error) throw error;
      return data as { secret: string; uri: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
    },
    onError: (err: unknown) => {
      toast.error(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

/**
 * Verify and enable TOTP (second step of 2FA setup)
 */
export function useEnableTOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await sb
        .rpc('enable_totp', { p_code: code });

      if (error) throw error;
      return data as { enabled: boolean; backup_codes: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
      toast.success('2FA activée avec succès!');
    },
    onError: (err: unknown) => {
      toast.error(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

/**
 * Disable TOTP
 */
export function useDisableTOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await sb
        .rpc('disable_totp');

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
      toast.success('2FA désactivée');
    },
    onError: (err: unknown) => {
      toast.error(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

/**
 * Verify TOTP code (used during login)
 */
export function useVerifyTOTP() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await sb
        .rpc('verify_totp', { p_code: code });

      if (error) throw error;
      return data as boolean;
    },
    onError: () => {
      toast.error('Code invalide');
    },
  });
}
