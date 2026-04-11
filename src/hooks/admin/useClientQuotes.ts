import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientQuote {
  id: string;
  quote_number: string;
  company_name: string | null;
  contact_name: string;
  contact_email: string;
  subtotal_ht: number;
  tva_amount: number;
  total_ttc: number;
  status: string;
  valid_until: string;
  pdf_url: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export function useClientQuotes(profileId: string | null) {
  return useQuery({
    queryKey: ["client-quotes", profileId],
    queryFn: async (): Promise<ClientQuote[]> => {
      if (!profileId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from("quotes")
        .select("id, quote_number, company_name, contact_name, contact_email, subtotal_ht, tva_amount, total_ttc, status, valid_until, pdf_url, sent_at, accepted_at, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ClientQuote[];
    },
    enabled: !!profileId,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });
}
