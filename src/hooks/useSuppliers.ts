import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Supplier } from '@/types/supplier';

export type { Supplier };

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name', { ascending: true });

        if (!isMounted) return;
        if (error) throw error;
        setSuppliers(data || []);
        setError(null);
      } catch (_err) {
        if (!isMounted) return;

        setError('Erreur lors du chargement des fournisseurs');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
const SUPPLIERS_KEY = ['suppliers'] as const;

const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const useSuppliers = () => {
  const queryClient = useQueryClient();

  const {
    data: suppliers = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: fetchSuppliers,
    staleTime: 2 * 60_000,
  });

  const error = queryError ? (queryError as Error).message : null;

  const createMutation = useMutation({
    mutationFn: async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplier])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Supplier> }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });

  // Wrappers that preserve the original return-value shape for backwards compat
  const createSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const data = await createMutation.mutateAsync(supplier);
      return { data, error: null as string | null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const data = await updateMutation.mutateAsync({ id, updates });
      return { data, error: null as string | null };
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return { error: null as string | null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  };

  return {
    suppliers,
    loading,
    error,
    refetch,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
};
