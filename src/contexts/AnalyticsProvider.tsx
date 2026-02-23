/**
 * AnalyticsProvider — composant "nul" à placer à l'intérieur de <BrowserRouter>.
 * - Trace un page_view à chaque changement de route.
 * - Initialise le hash utilisateur dès que la session change.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track, initUserHash } from "@/hooks/useAnalytics";

export function AnalyticsProvider() {
  const location = useLocation();

  // ── Page views ──────────────────────────────────────────────────────────────
  useEffect(() => {
    track("page_view", {
      path: location.pathname,
      search: location.search || undefined,
    });
  }, [location.pathname, location.search]);

  // ── Initialisation du hash utilisateur ─────────────────────────────────────
  useEffect(() => {
    // Initialisation au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      initUserHash(session?.user?.id);
    });

    // Mise à jour au changement de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        initUserHash(session?.user?.id);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
