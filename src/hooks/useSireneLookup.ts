import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SireneAddress {
  street: string;
  zip: string;
  city: string;
  codeCommune: string | null;
}

export interface SireneResult {
  siret: string;
  siren: string;
  name: string;
  nafCode: string | null;
  nafLabel: string | null;
  legalForm: string | null;
  foundedDate: string | null;
  employeeRange: string | null;
  address: SireneAddress;
  administrativeStatus: 'A' | 'C' | null;
  raw: unknown;
}

export type SireneMode = 'autocomplete' | 'siret' | 'siren';

interface SireneResponse {
  results: SireneResult[];
  cached: boolean;
}

/**
 * Debounce a value. Defaults to 300ms — aligné sur SearchAutocomplete.
 */
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

/**
 * Détecte automatiquement le mode : 14 chiffres = siret, 9 chiffres = siren, sinon autocomplete.
 */
export function detectSireneMode(query: string): SireneMode {
  const clean = query.replace(/\s+/g, '');
  if (/^\d{14}$/.test(clean)) return 'siret';
  if (/^\d{9}$/.test(clean)) return 'siren';
  return 'autocomplete';
}

/**
 * Recherche l'API Recherche d'Entreprises (data.gouv.fr) via edge function proxy.
 * - Mode `autocomplete` : recherche par nom (min. 3 caractères)
 * - Mode `siret` : lookup direct (14 chiffres, Luhn-valide)
 * - Mode `siren` : lookup direct (9 chiffres, Luhn-valide)
 *
 * La requête est debouncée 300 ms et mise en cache React Query 1h.
 */
export function useSireneLookup(query: string, explicitMode?: SireneMode) {
  const debounced = useDebouncedValue(query, 300);
  const clean = debounced.replace(/\s+/g, '');
  const mode = explicitMode ?? detectSireneMode(clean);

  const enabled = (() => {
    if (mode === 'siret') return /^\d{14}$/.test(clean);
    if (mode === 'siren') return /^\d{9}$/.test(clean);
    return clean.length >= 3;
  })();

  return useQuery<SireneResult[], Error>({
    queryKey: ['sirene-lookup', mode, clean],
    enabled,
    staleTime: 60 * 60_000, // 1h
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<SireneResponse>(
        'recherche-entreprises-search',
        {
          body: { query: clean, mode, limit: mode === 'autocomplete' ? 8 : 3 },
        },
      );
      if (error) {
        throw new Error(error.message || 'Erreur lors de la recherche SIRENE');
      }
      return data?.results ?? [];
    },
  });
}
