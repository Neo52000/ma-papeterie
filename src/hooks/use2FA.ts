import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Admin2FAStatus {
  enabled: boolean;
  currentLevel: 'aal1' | 'aal2' | null;
  nextLevel: 'aal1' | 'aal2' | null;
  factors: MfaFactor[];
}

export function use2FAStatus() {
  return useQuery({
    queryKey: ['admin-2fa-status'],
    queryFn: async (): Promise<Admin2FAStatus> => {
      const [factorResult, aalResult] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      if (factorResult.error) throw factorResult.error;
      if (aalResult.error) throw aalResult.error;

      const factors = factorResult.data.totp as MfaFactor[];
      return {
        enabled: factors.some((factor) => factor.status === 'verified'),
        currentLevel: aalResult.data.currentLevel,
        nextLevel: aalResult.data.nextLevel,
        factors,
      };
    },
  });
}

export function useEnrollTOTP() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Administration Ma Papeterie',
      });
      if (error) throw error;
      return data;
    },
    onError: (err: unknown) => {
      toast.error(`Erreur d'activation : ${err instanceof Error ? err.message : String(err)}`);
    },
  });
}

export function useVerifyTOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ factorId, code }: { factorId: string; code: string }) => {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verification = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verification.error) throw verification.error;
      return verification.data;
    },
    onSuccess: async () => {
      await useAuthStore.getState().refreshMfa();
      await queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
      toast.success('Authentification à deux facteurs vérifiée');
    },
    onError: () => {
      toast.error('Code invalide ou expiré');
    },
  });
}

export function useDisableTOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (factorId: string) => {
      const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await useAuthStore.getState().refreshMfa();
      await queryClient.invalidateQueries({ queryKey: ['admin-2fa-status'] });
      toast.success('Facteur TOTP désactivé');
    },
    onError: (err: unknown) => {
      toast.error(`Erreur de désactivation : ${err instanceof Error ? err.message : String(err)}`);
    },
  });
}
