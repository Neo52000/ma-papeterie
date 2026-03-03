import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ProductException {
  id: string;
  product_id: string;
  exception_type: string;
  details: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  product?: { name: string; ean: string | null };
}

export const useProductExceptions = () => {
  const [exceptions, setExceptions] = useState<ProductException[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_exceptions')
        .select('*, product:products(name, ean)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExceptions((data as ProductException[]) || []);
    } catch (err) {
      // Error silently handled
    } finally {
      setLoading(false);
    }
  };

  const resolveException = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_exceptions')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Exception résolue');
      await fetchExceptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const createException = async (productId: string, type: string, details: Record<string, unknown> = {}) => {
    try {
      const { error } = await supabase
        .from('product_exceptions')
        .insert({ product_id: productId, exception_type: type, details: details as unknown as Json });

      if (error) throw error;
      await fetchExceptions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const unresolvedCount = exceptions.filter(e => !e.resolved).length;

  return { exceptions, loading, resolveException, createException, refetch: fetchExceptions, unresolvedCount };
};
