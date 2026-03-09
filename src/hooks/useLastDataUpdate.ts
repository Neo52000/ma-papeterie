import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Interroge Supabase pour récupérer la date de dernière modification
 * des produits (table `products`, colonne `updated_at`).
 * Rafraîchit automatiquement toutes les 60 secondes.
 */
export function useLastDataUpdate() {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.updated_at) {
        setLastUpdate(data.updated_at);
      }
    } catch {
      // silently ignore – fallback to build date
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, []);

  return { lastUpdate, loading };
}
