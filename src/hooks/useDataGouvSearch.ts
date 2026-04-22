import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProspectSegment } from "./useProspects";

export interface DataGouvEntity {
  siren: string;
  siret: string;
  name: string;
  nafCode: string | null;
  nafLabel: string | null;
  legalForm: string | null;
  employeeRange: string | null;
  foundedDate: string | null;
  address: {
    street: string;
    zip: string;
    city: string;
    dept: string | null;
    codeCommune: string | null;
  };
  administrativeStatus: "A" | "C" | null;
  raw: unknown;
}

export interface DataGouvSearchFilters {
  nafCodes?: string[];
  depts?: string[];
  minEffectif?: string;
  maxEffectif?: string;
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  perPage?: number;
}

export interface DataGouvSearchResponse {
  results: DataGouvEntity[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Search (preview) ────────────────────────────────────────────────────────

export function useDataGouvSearch() {
  return useMutation<DataGouvSearchResponse, Error, DataGouvSearchFilters>({
    mutationFn: async (filters) => {
      const { data, error } = await supabase.functions.invoke(
        "data-gouv-search-prospects",
        { body: filters },
      );
      if (error) throw error;
      return data as DataGouvSearchResponse;
    },
  });
}

// ── Import bulk ─────────────────────────────────────────────────────────────

export interface DataGouvImportResult {
  success: boolean;
  total_received: number;
  imported: number;
  updated: number;
  skipped_existing_client: number;
  skipped_invalid: number;
  enrolled: number;
  errors: number;
  prospect_ids: string[];
}

export function useDataGouvImport() {
  const qc = useQueryClient();
  return useMutation<
    DataGouvImportResult,
    Error,
    {
      entities: DataGouvEntity[];
      campaign_id?: string;
      assigned_to?: string;
      cap?: number;
    }
  >({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke(
        "data-gouv-import-prospects",
        { body: input },
      );
      if (error) throw error;
      return data as DataGouvImportResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects-list"] });
      qc.invalidateQueries({ queryKey: ["prospection-kpis"] });
      qc.invalidateQueries({ queryKey: ["prospect-campaigns"] });
    },
  });
}

// ── Helper : segment suggéré à partir du NAF ────────────────────────────────
// (simple mapping UI, le calcul définitif se fait côté edge function)

export function guessSegmentFromNaf(naf: string | null): ProspectSegment {
  if (!naf) return "pme";
  const norm = naf.toUpperCase();
  if (norm.startsWith("85") || norm.startsWith("88.9")) return "educational";
  if (norm.startsWith("84") || norm.startsWith("87")) return "public";
  if (["69", "70", "71", "72", "73", "74", "75", "86"].some((p) => norm.startsWith(p))) {
    return "liberal";
  }
  return "pme";
}
