import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseAdminCrudOptions {
  /** Supabase table name */
  table: string;
  /** TanStack Query key prefix */
  queryKey: string;
  /** Columns to select (default: '*') */
  select?: string;
  /** Column to order by (default: 'created_at') */
  orderBy?: string;
  /** Order direction (default: 'desc') */
  orderDir?: 'asc' | 'desc';
  /** Optional filter function applied to the query builder */
  filter?: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>;
  /** Toast messages */
  messages?: {
    createSuccess?: string;
    updateSuccess?: string;
    deleteSuccess?: string;
    error?: string;
  };
  /** staleTime for TanStack Query (default: 5 minutes) */
  staleTime?: number;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

export function useAdminCrud<T extends { id: string }>(options: UseAdminCrudOptions) {
  const {
    table,
    queryKey,
    select = '*',
    orderBy = 'created_at',
    orderDir = 'desc',
    messages = {},
    staleTime = 5 * 60_000,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();
  const fullQueryKey = [queryKey];
  // Bypass stale generated types for dynamic table names
  const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: fullQueryKey,
    queryFn: async () => {
      let query = db.from(table).select(select).order(orderBy, { ascending: orderDir === 'asc' });
      if (options.filter) {
        query = options.filter(query as unknown as ReturnType<typeof supabase.from>) as unknown as typeof query;
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },
    staleTime,
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: Omit<T, 'id'>) => {
      const { data, error } = await db.from(table).insert(newItem as Record<string, unknown>).select().single();
      if (error) throw error;
      return data as unknown as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
      toast.success(messages.createSuccess ?? 'Élément créé');
    },
    onError: (err: Error) => {
      toast.error(messages.error ?? 'Erreur', { description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<T> & { id: string }) => {
      const { data, error } = await db.from(table).update(updates as Record<string, unknown>).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
      toast.success(messages.updateSuccess ?? 'Élément mis à jour');
    },
    onError: (err: Error) => {
      toast.error(messages.error ?? 'Erreur', { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fullQueryKey });
      toast.success(messages.deleteSuccess ?? 'Élément supprimé');
    },
    onError: (err: Error) => {
      toast.error(messages.error ?? 'Erreur', { description: err.message });
    },
  });

  return {
    items,
    isLoading,
    error,
    refetch,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,
  };
}
