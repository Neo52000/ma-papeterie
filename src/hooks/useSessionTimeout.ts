import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

// Durées d'inactivité en millisecondes
const TIMEOUT_B2C_MS = 30 * 60 * 1000; // 30 minutes
const TIMEOUT_PRO_MS = 2 * 60 * 60 * 1000; // 2 heures
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Avertissement 5 min avant

interface UseSessionTimeoutOptions {
  isPro: boolean;
  enabled: boolean;
  onWarning?: () => void;
  onTimeout?: () => void;
}

/**
 * Hook de timeout d'inactivité pour les sessions utilisateur.
 * - B2C : déconnexion après 30 min d'inactivité
 * - B2B/Pro : déconnexion après 2h d'inactivité
 * - Avertissement 5 min avant expiration via le callback onWarning
 */
export function useSessionTimeout({
  isPro,
  enabled,
  onWarning,
  onTimeout,
}: UseSessionTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();

    const timeoutMs = isPro ? TIMEOUT_PRO_MS : TIMEOUT_B2C_MS;
    const warningMs = timeoutMs - WARNING_BEFORE_MS;

    if (warningMs > 0) {
      warningRef.current = setTimeout(() => {
        onWarning?.();
      }, warningMs);
    }

    timeoutRef.current = setTimeout(async () => {
      onTimeout?.();
      await supabase.auth.signOut();
    }, timeoutMs);
  }, [isPro, onWarning, onTimeout, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    resetTimers();

    const handleActivity = () => resetTimers();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, resetTimers, clearTimers]);
}
