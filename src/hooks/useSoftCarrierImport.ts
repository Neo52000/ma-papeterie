import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SoftCarrierSource = 'preislis' | 'artx' | 'tarifsb2b' | 'herstinfo' | 'lagerbestand';

interface ImportResult {
  success: number;
  errors: number;
  details?: string[];
}

export const useSoftCarrierImport = () => {
  const [importing, setImporting] = useState<SoftCarrierSource | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, ImportResult>>({});

  const importFile = async (source: SoftCarrierSource, file: File) => {
    setImporting(source);
    try {
      const data = await file.text();
      
      const { data: result, error } = await supabase.functions.invoke('import-softcarrier', {
        body: { source, data },
      });

      if (error) throw error;

      setLastResult(prev => ({ ...prev, [source]: result }));
      
      toast.success(`Import ${source} terminé`, {
        description: `${result.success} succès, ${result.errors} erreurs`,
      });
      
      return result;
    } catch (err: any) {
      toast.error(`Erreur import ${source}`, { description: err.message });
      throw err;
    } finally {
      setImporting(null);
    }
  };

  return { importFile, importing, lastResult };
};
