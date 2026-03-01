import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_PREFERENCES_KEY = 'cookie_preferences';

const DEFAULT_PREFS: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
};

function readConsentFromStorage(): boolean | null {
  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    return consent !== null ? consent === 'true' : null;
  } catch {
    return null;
  }
}

function readPrefsFromStorage(): CookiePreferences {
  try {
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_PREFS;
}

export function useCookieConsent() {
  const [hasConsented, setHasConsented] = useState<boolean | null>(readConsentFromStorage);
  const [preferences, setPreferences] = useState<CookiePreferences>(readPrefsFromStorage);

  const saveConsent = async (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setHasConsented(true);
    setPreferences(prefs);

    // Save to database for logged-in users
    const { data: { user } } = await supabase.auth.getUser();
    
    const consentTypes = [
      { type: 'cookies_essential', consented: prefs.essential },
      { type: 'cookies_analytics', consented: prefs.analytics },
      { type: 'cookies_marketing', consented: prefs.marketing }
    ];

    for (const consent of consentTypes) {
      await supabase.from('user_consents').upsert({
        user_id: user?.id || null,
        consent_type: consent.type,
        consented: consent.consented,
        consented_at: new Date().toISOString(),
        user_agent: navigator.userAgent
      }, {
        onConflict: 'user_id,consent_type',
        ignoreDuplicates: false
      }).select();
    }
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true
    });
  };

  const rejectAll = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false
    });
  };

  const saveCustom = (prefs: CookiePreferences) => {
    saveConsent({
      ...prefs,
      essential: true // Essential is always true
    });
  };

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    setHasConsented(null);
    setPreferences({
      essential: true,
      analytics: false,
      marketing: false
    });
  };

  return {
    hasConsented,
    preferences,
    acceptAll,
    rejectAll,
    saveCustom,
    resetConsent
  };
}