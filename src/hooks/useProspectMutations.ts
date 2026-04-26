import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProspectStatus } from "./useProspects";

// ── Update status / assignation ──────────────────────────────────────────────

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      status?: ProspectStatus;
      assigned_to?: string | null;
      tags?: string[];
      notes?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
      website?: string | null;
    }) => {
      const { id, ...patch } = params;
      const { error, data } = await supabase
        .from("prospects")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["prospects-list"] });
      qc.invalidateQueries({ queryKey: ["prospect-detail", vars.id] });
      qc.invalidateQueries({ queryKey: ["prospection-kpis"] });
    },
  });
}

// ── Log interaction manuelle (appel, visite, note) ──────────────────────────

export function useLogProspectInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      prospect_id: string;
      channel: "email" | "phone" | "visit" | "web" | "system";
      direction?: "inbound" | "outbound";
      subject?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const payload = {
        prospect_id: params.prospect_id,
        channel: params.channel,
        direction: params.direction ?? "outbound",
        subject: params.subject ?? null,
        description: params.description ?? null,
        metadata: (params.metadata ?? {}) as never,
        created_by: user.user?.id ?? null,
      };
      const { error, data } = await supabase
        .from("prospect_interactions")
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;

      // Auto : passer le prospect au statut "contacted" s'il est encore "new" ou "qualified"
      await supabase
        .from("prospects")
        .update({ status: "contacted" })
        .eq("id", params.prospect_id)
        .in("status", ["new", "qualified"]);

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["prospect-detail", vars.prospect_id] });
      qc.invalidateQueries({ queryKey: ["prospects-list"] });
    },
  });
}

// ── Conversion prospect → client (RPC) ──────────────────────────────────────

export function useConvertProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      prospect_id: string;
      user_id?: string | null;
      display_name?: string | null;
    }) => {
      // RPC pas encore régénéré dans supabase/types.ts — on cast le nom
      const { error, data } = await supabase.rpc(
        "promote_prospect_to_client" as never,
        {
          p_prospect_id: params.prospect_id,
          p_user_id: params.user_id ?? undefined,
          p_display_name: params.display_name ?? undefined,
        } as never,
      );
      if (error) throw error;
      if (!data) throw new Error("Aucune donnée retournée par la conversion");
      const row = Array.isArray(data) ? data[0] : data;
      return row as { profile_id: string | null; b2b_account_id: string };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["prospects-list"] });
      qc.invalidateQueries({ queryKey: ["prospect-detail", vars.prospect_id] });
      qc.invalidateQueries({ queryKey: ["prospection-kpis"] });
      qc.invalidateQueries({ queryKey: ["customer-list"] });
    },
  });
}

// ── Suppression prospect (admin uniquement en pratique) ─────────────────────

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects-list"] });
      qc.invalidateQueries({ queryKey: ["prospection-kpis"] });
    },
  });
}
