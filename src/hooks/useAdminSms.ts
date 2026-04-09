import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ── SMS Logs ────────────────────────────────────────────────────────────────

interface SmsLogsFilters {
  status?: string;
  sms_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useSmsLogs(filters: SmsLogsFilters = {}) {
  return useQuery({
    queryKey: ["sms-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("sms_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.sms_type) query = query.eq("sms_type", filters.sms_type);
      if (filters.search) query = query.ilike("recipient_phone", `%${filters.search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      return { logs: data || [], total: count || 0 };
    },
    staleTime: 30_000,
  });
}

// ── SMS Stats ───────────────────────────────────────────────────────────────

export function useSmsStats() {
  return useQuery({
    queryKey: ["sms-stats"],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todayRes, weekRes, monthRes] = await Promise.all([
        supabase.from("sms_logs").select("status", { count: "exact" }).gte("created_at", todayStart),
        supabase.from("sms_logs").select("status", { count: "exact" }).gte("created_at", weekStart),
        supabase.from("sms_logs").select("status", { count: "exact" }).gte("created_at", monthStart),
      ]);

      const countByStatus = (data: { status: string }[] | null) => {
        const counts = { total: 0, sent: 0, delivered: 0, failed: 0, rejected: 0 };
        (data || []).forEach((r) => {
          counts.total++;
          if (r.status in counts) counts[r.status as keyof typeof counts]++;
        });
        return counts;
      };

      return {
        today: countByStatus(todayRes.data),
        week: countByStatus(weekRes.data),
        month: countByStatus(monthRes.data),
      };
    },
    staleTime: 60_000,
  });
}

// ── SMS Campaigns ───────────────────────────────────────────────────────────

export function useSmsCampaigns() {
  return useQuery({
    queryKey: ["sms-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useCreateSmsCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: {
      name: string;
      message_text: string;
      target_segment: string;
      custom_phone_numbers?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const { data, error } = await supabase
        .from("sms_campaigns")
        .insert({ ...campaign, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms-campaigns"] });
      toast.success("Campagne SMS créée");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la campagne");
    },
  });
}

export function useSendSmsCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("send-sms-campaign", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sms-campaigns"] });
      qc.invalidateQueries({ queryKey: ["sms-logs"] });
      qc.invalidateQueries({ queryKey: ["sms-stats"] });
      toast.success(`Campagne envoyée : ${data?.sent || 0} SMS`);
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de la campagne");
    },
  });
}

// ── Gateway Health ──────────────────────────────────────────────────────────

export function useSmsGatewayHealth() {
  return useQuery({
    queryKey: ["sms-gateway-health"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sms-gateway-health");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // Refresh every 5 min
  });
}

// ── SMS Templates ───────────────────────────────────────────────────────────

export function useSmsTemplates() {
  return useQuery({
    queryKey: ["sms-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .order("slug");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateSmsTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body_template,
      is_active,
    }: {
      id: string;
      body_template?: string;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from("sms_templates")
        .update({
          ...(body_template !== undefined && { body_template }),
          ...(is_active !== undefined && { is_active }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms-templates"] });
      toast.success("Template SMS mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour du template");
    },
  });
}
