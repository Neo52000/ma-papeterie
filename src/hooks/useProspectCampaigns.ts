import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProspectSegment } from "./useProspects";

export interface ProspectCampaign {
  id: string;
  name: string;
  description: string | null;
  target_segment: ProspectSegment | null;
  target_filters: Record<string, unknown>;
  brevo_list_id: number | null;
  brevo_workflow_id: number | null;
  status: "draft" | "active" | "paused" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  enrollment_count?: number;
}

export function useProspectCampaigns() {
  return useQuery({
    queryKey: ["prospect-campaigns"],
    queryFn: async () => {
      const { data: campaigns, error } = await supabase
        .from("prospect_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (campaigns ?? []) as unknown as ProspectCampaign[];

      // Ajoute le compteur d'inscrits par campagne
      if (rows.length > 0) {
        const { data: counts } = await supabase
          .from("prospect_enrollments")
          .select("campaign_id")
          .in("campaign_id", rows.map((c) => c.id));
        const tally = new Map<string, number>();
        for (const c of counts ?? []) {
          const id = (c as { campaign_id: string }).campaign_id;
          tally.set(id, (tally.get(id) ?? 0) + 1);
        }
        for (const r of rows) r.enrollment_count = tally.get(r.id) ?? 0;
      }

      return rows;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateProspectCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      target_segment?: ProspectSegment;
      target_filters?: Record<string, unknown>;
      brevo_list_id?: number;
      brevo_workflow_id?: number;
      status?: "draft" | "active";
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const payload = {
        name: input.name,
        description: input.description ?? null,
        target_segment: input.target_segment ?? null,
        target_filters: (input.target_filters ?? {}) as never,
        brevo_list_id: input.brevo_list_id ?? null,
        brevo_workflow_id: input.brevo_workflow_id ?? null,
        status: input.status ?? "draft",
        created_by: user.user?.id ?? null,
      };
      const { error, data } = await supabase
        .from("prospect_campaigns")
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ProspectCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-campaigns"] });
    },
  });
}

export function useUpdateProspectCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      description?: string | null;
      status?: "draft" | "active" | "paused" | "archived";
      brevo_list_id?: number | null;
      brevo_workflow_id?: number | null;
    }) => {
      const { id, ...patch } = input;
      const { error, data } = await supabase
        .from("prospect_campaigns")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-campaigns"] });
    },
  });
}

// Enrôle un set de prospects dans une campagne (sans passer par l'edge function)
export function useEnrollProspects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { campaign_id: string; prospect_ids: string[] }) => {
      const rows = input.prospect_ids.map((pid) => ({
        prospect_id: pid,
        campaign_id: input.campaign_id,
        enrolled_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("prospect_enrollments")
        .upsert(rows, { onConflict: "prospect_id,campaign_id" });
      if (error) throw error;
      return { count: rows.length };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["prospect-campaigns"] });
      for (const pid of vars.prospect_ids) {
        qc.invalidateQueries({ queryKey: ["prospect-detail", pid] });
      }
    },
  });
}

// Déclenche la séquence Brevo (edge function crm-brevo-automation)
export function useTriggerBrevoEnrollment() {
  return useMutation({
    mutationFn: async (input: { campaign_id: string; prospect_ids: string[] }) => {
      const { data, error } = await supabase.functions.invoke("crm-brevo-automation", {
        body: { action: "enrol_prospects", campaign_id: input.campaign_id, prospect_ids: input.prospect_ids },
      });
      if (error) throw error;
      return data as { success: boolean; enrolled?: number; errors?: number };
    },
  });
}
