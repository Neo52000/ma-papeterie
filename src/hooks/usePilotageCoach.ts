import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CoachConversation, CoachMessage } from '@/types/pilotage';

// -----------------------------------------------------------------------------
// Hook : liste des conversations
// -----------------------------------------------------------------------------
export function useCoachConversations(includeArchived = false) {
  return useQuery({
    queryKey: ['pilotage', 'coach', 'conversations', includeArchived],
    queryFn: async (): Promise<CoachConversation[]> => {
      let query = supabase
        .from('pilotage_coach_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (!includeArchived) query = query.eq('archived', false);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CoachConversation[];
    },
    staleTime: 30_000,
  });
}

// -----------------------------------------------------------------------------
// Hook : messages d'une conversation
// -----------------------------------------------------------------------------
export function useCoachMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['pilotage', 'coach', 'messages', conversationId],
    queryFn: async (): Promise<CoachMessage[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('pilotage_coach_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CoachMessage[];
    },
    enabled: conversationId !== null,
    staleTime: 5_000,
  });
}

// -----------------------------------------------------------------------------
// Mutation : envoyer un message
// -----------------------------------------------------------------------------
interface SendMessageParams {
  conversationId: string | null;
  message: string;
  includeKpiContext?: boolean;
}

interface SendMessageResponse {
  conversation_id: string;
  assistant_message: CoachMessage;
}

export function useSendCoachMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: SendMessageParams): Promise<SendMessageResponse> => {
      const { data, error } = await supabase.functions.invoke('pilotage-coach', {
        body: {
          conversation_id: params.conversationId,
          message: params.message,
          include_kpi_context: params.includeKpiContext ?? true,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Unknown error');
      return {
        conversation_id: data.conversation_id,
        assistant_message: data.assistant_message,
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'coach', 'messages', data.conversation_id] });
      qc.invalidateQueries({ queryKey: ['pilotage', 'coach', 'conversations'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Mutation : archiver une conversation
// -----------------------------------------------------------------------------
export function useArchiveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('pilotage_coach_conversations')
        .update({ archived: true })
        .eq('id', conversationId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'coach', 'conversations'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Mutation : supprimer une conversation
// -----------------------------------------------------------------------------
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('pilotage_coach_conversations')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pilotage', 'coach', 'conversations'] });
    },
  });
}
