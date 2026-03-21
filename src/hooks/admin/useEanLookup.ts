import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EanLookupResult } from "@/types/product";

export function useEanLookup() {
  const [eanLookupLoading, setEanLookupLoading] = useState(false);
  const [eanLookupResult, setEanLookupResult] = useState<EanLookupResult | null>(null);

  const handleEanLookup = async (ean: string | undefined) => {
    if (!ean) return;
    setEanLookupLoading(true);
    setEanLookupResult(null);
    try {
      // 1) Chercher d'abord dans la base locale
      const { data: localProduct } = await supabase
        .from('products')
        .select('name, brand, manufacturer_code, description, price, price_ttc, category')
        .eq('ean', ean.trim())
        .maybeSingle();

      if (localProduct) {
        setEanLookupResult({
          marque: (localProduct as any).brand || undefined,
          reference_fabricant: (localProduct as any).manufacturer_code || undefined,
          designation_courte: (localProduct as any).name || undefined,
          caracteristiques: (localProduct as any).category || undefined,
          prix_ttc_constate: (localProduct as any).price_ttc ?? (localProduct as any).price ?? null,
          titre_ecommerce: (localProduct as any).name || undefined,
          description: (localProduct as any).description || undefined,
          source: 'local',
        });
        return;
      }

      // 2) Sinon appeler ChatGPT
      const { data, error } = await supabase.functions.invoke('lookup-ean', { body: { ean } });
      if (error) throw error;
      setEanLookupResult({ ...data, source: 'chatgpt' });
    } catch (err) {
      setEanLookupResult({ erreur: err instanceof Error ? err.message : String(err) });
    } finally {
      setEanLookupLoading(false);
    }
  };

  const clearEanLookupResult = () => setEanLookupResult(null);

  return {
    eanLookupLoading,
    eanLookupResult,
    handleEanLookup,
    clearEanLookupResult,
  };
}
