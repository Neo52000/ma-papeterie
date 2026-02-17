import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductException {
  id: string;
  product_id: string;
  exception_type: string;
  details: Record<string, any>;
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
      setExceptions((data as any) || []);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
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
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const createException = async (productId: string, type: string, details: Record<string, any> = {}) => {
    try {
      const { error } = await supabase
        .from('product_exceptions')
        .insert({ product_id: productId, exception_type: type, details });

      if (error) throw error;
      await fetchExceptions();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const unresolvedCount = exceptions.filter(e => !e.resolved).length;

  return { exceptions, loading, resolveException, createException, refetch: fetchExceptions, unresolvedCount };
};
