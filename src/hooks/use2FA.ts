import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Admin2FAStatus {
  id: string;
  totp_enabled: boolean;
  backup_codes: string[];
}

/**
 * Fetch current user's 2FA status
 */
export function use2FAStatus() {
  return useQuery({
    queryKey: ['admin-2fa-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('admin_users')
        .select('id, totp_enabled, backup_codes')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      
      return data || { id: user.id, totp_enabled: false, backup_codes: [] };
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
      const { data, error } = await supabase
        .rpc('generate_totp_secret');

      if (error) throw error;
      return data; // { secret, uri }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
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
      const { data, error } = await supabase
        .rpc('enable_totp', { p_code: code });

      if (error) throw error;
      return data; // { enabled, backup_codes }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
      toast.success('2FA activée avec succès!');
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
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
      const { data, error } = await supabase
        .rpc('disable_totp');

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
      toast.success('2FA désactivée');
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });
}

/**
 * Verify TOTP code (used during login)
 */
export function useVerifyTOTP() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase
        .rpc('verify_totp', { p_code: code });

      if (error) throw error;
      return data; // boolean
    },
    onError: (err: any) => {
      toast.error('Code invalide');
    },
  });
}
