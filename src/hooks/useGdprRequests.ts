import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GdprRequest {
  id: string;
  user_id: string;
  request_type: 'export' | 'deletion' | 'rectification' | 'access';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;
  response_data: Record<string, unknown> | null;
}

// Fetch user's GDPR requests
export function useGdprRequests() {
  return useQuery({
    queryKey: ['gdpr-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as GdprRequest[];
    }
  });
}

// Fetch all GDPR requests (admin)
export function useAllGdprRequests(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['admin-gdpr-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('gdpr_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GdprRequest[];
    }
  });
}

// Export user data
export function useExportData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const { data, error } = await supabase.functions.invoke('gdpr-data-export', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gdpr-requests'] });
      
      // Download JSON file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-rgpd-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Vos données ont été exportées avec succès"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

// Delete account
export function useDeleteAccount() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const { data, error } = await supabase.functions.invoke('gdpr-delete-account', {
        body: { confirm: 'DELETE_MY_ACCOUNT' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé avec succès"
      });
      // Sign out and redirect
      supabase.auth.signOut();
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

// Update GDPR request (admin)
export function useUpdateGdprRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gdpr_requests')
        .update({
          status,
          notes,
          processed_at: status === 'completed' || status === 'rejected' ? new Date().toISOString() : null,
          processed_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gdpr-requests'] });
      toast({
        title: "Demande mise à jour",
        description: "La demande RGPD a été traitée"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}