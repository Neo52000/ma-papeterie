import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EanLookupResult } from "@/types/product";

interface LocalProductResult {
  name: string | null;
  brand: string | null;
  manufacturer_code: string | null;
  description: string | null;
  price: number | null;
  price_ttc: number | null;
  category: string | null;
}

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
        const lp = localProduct as unknown as LocalProductResult;
        setEanLookupResult({
          marque: lp.brand || undefined,
          reference_fabricant: lp.manufacturer_code || undefined,
          designation_courte: lp.name || undefined,
          caracteristiques: lp.category || undefined,
          prix_ttc_constate: lp.price_ttc ?? lp.price ?? null,
          titre_ecommerce: lp.name || undefined,
          description: lp.description || undefined,
          source: 'local',
        });
        return;
      }

      // 2) Sinon appeler ChatGPT
      const { data, error } = await supabase.functions.invoke('lookup-ean', { body: { ean } });
      if (error) throw error;
      setEanLookupResult({ ...(data as Record<string, unknown>), source: 'chatgpt' } as EanLookupResult);
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
