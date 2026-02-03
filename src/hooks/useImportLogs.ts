import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ImportLog {
  id: string;
  supplier_id: string | null;
  format: string;
  filename: string | null;
  total_rows: number | null;
  success_count: number | null;
  error_count: number | null;
  unmatched_count: number | null;
  imported_by: string | null;
  imported_at: string | null;
  errors: any[] | null;
  supplier_name?: string;
}

export const useImportLogs = (supplierId?: string) => {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('supplier_import_logs')
        .select(`
          *,
          suppliers:supplier_id (name)
        `)
        .order('imported_at', { ascending: false })
        .limit(50);
      
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      const formattedLogs: ImportLog[] = (data || []).map((log: any) => ({
        ...log,
        supplier_name: log.suppliers?.name || 'Inconnu',
        errors: Array.isArray(log.errors) ? log.errors : []
      }));
      
      setLogs(formattedLogs);
      setError(null);
    } catch (err) {
      console.error('Error fetching import logs:', err);
      setError('Erreur lors du chargement des logs d\'import');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [supplierId]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
};
