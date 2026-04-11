import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Quote {
  id: string;
  quote_number: string;
  profile_id: string | null;
  pipeline_id: string | null;
  company_name: string | null;
  contact_name: string;
  contact_email: string;
  items: QuoteItem[];
  subtotal_ht: number;
  tva_amount: number;
  total_ttc: number;
  status: string;
  valid_until: string;
  payment_terms: string | null;
  notes: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  ref: string;
  label: string;
  qty: number;
  unit_price_ht: number;
  tva_rate: number;
  total_ht: number;
}

export function useQuotesList(statusFilter?: string) {
  return useQuery({
    queryKey: ["crm-quotes", statusFilter],
    queryFn: async (): Promise<Quote[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      let query = client
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      profileId?: string;
      pipelineId?: string;
      contactName: string;
      contactEmail: string;
      companyName?: string;
      items: QuoteItem[];
      paymentTerms?: string;
      notes?: string;
      validDays?: number;
      sendEmail?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("crm-quote-generator", {
        body: {
          profile_id: input.profileId,
          pipeline_id: input.pipelineId,
          contact_name: input.contactName,
          contact_email: input.contactEmail,
          company_name: input.companyName,
          items: input.items,
          payment_terms: input.paymentTerms,
          notes: input.notes,
          valid_days: input.validDays,
          send_email: input.sendEmail,
        },
      });
      if (error) throw error;
      return data as { quote_id: string; quote_number: string; pdf_url: string; total_ttc: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const updateData: Record<string, unknown> = { status };

      if (status === "accepted") updateData.accepted_at = new Date().toISOString();
      if (status === "rejected") updateData.rejected_at = new Date().toISOString();

      const { error } = await client
        .from("quotes")
        .update(updateData)
        .eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-quotes"] });
    },
  });
}
