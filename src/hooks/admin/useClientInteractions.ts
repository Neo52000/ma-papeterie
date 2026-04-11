import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientInteraction {
  id: string;
  interaction_type: string;
  channel: string | null;
  subject: string | null;
  description: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AddInteractionInput {
  profileId: string;
  userId: string;
  interactionType: string;
  channel: string;
  subject: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export function useClientInteractions(profileId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ["client-interactions", profileId ?? userId],
    queryFn: async (): Promise<ClientInteraction[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      let query = client
        .from("customer_interactions")
        .select("id, interaction_type, channel, subject, description, notes, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (profileId) {
        query = query.eq("profile_id", profileId);
      } else if (userId) {
        query = query.eq("user_id", userId);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ClientInteraction[];
    },
    enabled: !!(profileId || userId),
    staleTime: 1 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useAddInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddInteractionInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error } = await client.from("customer_interactions").insert({
        user_id: input.userId,
        profile_id: input.profileId,
        interaction_type: input.interactionType,
        channel: input.channel,
        subject: input.subject,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        created_by: "00000000-0000-0000-0000-000000000000",
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-interactions", variables.profileId] });
    },
  });
}
