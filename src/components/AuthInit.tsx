import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

/**
 * Lightweight component that initializes the Zustand auth store
 * and manages session timeout. Replaces the old AuthProvider context.
 * Renders nothing — just side-effects.
 */
export function AuthInit() {
  const isPro = useAuthStore((s) => s.isPro);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const cleanup = useAuthStore.getState().init();
    return cleanup;
  }, []);

  // Session timeout : 30 min B2C, 2h B2B/Pro
  useSessionTimeout({
    isPro,
    enabled: !!user,
  });

  return null;
}
