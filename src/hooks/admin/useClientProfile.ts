import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  rfm_segment: string | null;
  rfm_recency: number | null;
  rfm_frequency: number | null;
  rfm_monetary: number | null;
  clv: number | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  first_order_at: string | null;
  avg_basket: number | null;
  tags: string[];
  notes: string | null;
  lead_source: string | null;
  client_type: string | null;
  engagement_score: number;
  created_at: string;
  // From auth user
  email?: string;
  phone?: string;
  // From RFM scores
  rfm?: {
    recency_score: number | null;
    frequency_score: number | null;
    monetary_score: number | null;
    rfm_segment: string | null;
    churn_risk: number | null;
    lifetime_value_estimate: number | null;
  };
}

export function useClientProfile(profileId: string | null) {
  return useQuery({
    queryKey: ["client-profile", profileId],
    queryFn: async (): Promise<ClientProfile | null> => {
      if (!profileId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data: profile, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      if (!profile) return null;

      // Fetch RFM scores
      const { data: rfm } = await client
        .from("customer_rfm_scores")
        .select("recency_score, frequency_score, monetary_score, rfm_segment, churn_risk, lifetime_value_estimate")
        .eq("user_id", profile.user_id)
        .single();

      // Fetch email from auth (via orders as proxy)
      const { data: orderWithEmail } = await supabase
        .from("orders")
        .select("customer_email, customer_phone")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        ...profile,
        tags: profile.tags ?? [],
        total_orders: profile.total_orders ?? 0,
        total_spent: profile.total_spent ?? 0,
        engagement_score: profile.engagement_score ?? 0,
        email: orderWithEmail?.customer_email ?? undefined,
        phone: orderWithEmail?.customer_phone ?? undefined,
        rfm: rfm ?? undefined,
      } as ClientProfile;
    },
    enabled: !!profileId,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });
}
