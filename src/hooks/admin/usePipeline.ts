import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineDeal {
  id: string;
  profile_id: string | null;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  stage: string;
  source: string | null;
  estimated_value: number | null;
  probability: number;
  weighted_value: number | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  lost_reason: string | null;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PIPELINE_STAGES = [
  { key: "lead", label: "Lead", color: "bg-slate-500" },
  { key: "contacted", label: "Contacte", color: "bg-blue-500" },
  { key: "qualified", label: "Qualifie", color: "bg-indigo-500" },
  { key: "quote_sent", label: "Devis envoye", color: "bg-purple-500" },
  { key: "negotiation", label: "Negociation", color: "bg-amber-500" },
  { key: "won", label: "Gagne", color: "bg-green-500" },
  { key: "lost", label: "Perdu", color: "bg-red-500" },
] as const;

export function usePipeline(filters?: { stage?: string; source?: string; minProbability?: number }) {
  return useQuery({
    queryKey: ["crm-pipeline", filters],
    queryFn: async (): Promise<PipelineDeal[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      let query = client
        .from("crm_pipeline")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.stage) query = query.eq("stage", filters.stage);
      if (filters?.source) query = query.eq("source", filters.source);
      if (filters?.minProbability) query = query.gte("probability", filters.minProbability);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PipelineDeal[];
    },
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const updateData: Record<string, unknown> = { stage };

      if (stage === "won") updateData.won_at = new Date().toISOString();
      if (stage === "lost") updateData.lost_at = new Date().toISOString();

      const { error } = await client
        .from("crm_pipeline")
        .update(updateData)
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-pipeline"] });
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: {
      companyName: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      source?: string;
      estimatedValue?: number;
      probability?: number;
      notes?: string;
      nextAction?: string;
      nextActionDate?: string;
      profileId?: string;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from("crm_pipeline")
        .insert({
          company_name: deal.companyName,
          contact_name: deal.contactName ?? null,
          contact_email: deal.contactEmail ?? null,
          contact_phone: deal.contactPhone ?? null,
          source: deal.source ?? null,
          estimated_value: deal.estimatedValue ?? null,
          probability: deal.probability ?? 10,
          notes: deal.notes ?? null,
          next_action: deal.nextAction ?? null,
          next_action_date: deal.nextActionDate ?? null,
          profile_id: deal.profileId ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-pipeline"] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealId, updates }: { dealId: string; updates: Partial<PipelineDeal> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error } = await client
        .from("crm_pipeline")
        .update(updates)
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-pipeline"] });
    },
  });
}
