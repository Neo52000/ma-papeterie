import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SoftCarrierSource } from '@/lib/softcarrier-parsers';
import type { ImportResult } from '@/components/admin/softcarrier/ImportResultCard';

export type { SoftCarrierSource };

const BATCH_SIZE = 500;

async function invokeWithRetry(fnName: string, body: Record<string, unknown>, maxRetries = 2): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.functions.invoke(fnName, { body });
    if (!error) return data;
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
      await new Promise(r => setTimeout(r, delay));
    } else {
      throw error;
    }
  }
}

export const useSoftCarrierImport = () => {
  const [importing, setImporting] = useState<SoftCarrierSource | null>(null);
  const [importProgress, setImportProgress] = useState('');
  const [lastResult, setLastResult] = useState<Record<string, ImportResult>>({});

  const importRows = useCallback(async (source: SoftCarrierSource, rows: Record<string, string>[]) => {
    setImporting(source);
    setImportProgress('');
    try {
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
      const totals: ImportResult = { created: 0, updated: 0, success: 0, errors: 0, skipped: 0, details: [] };

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        setImportProgress(`Lot ${batchNum}/${totalBatches} (${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} lignes)`);

        const data = await invokeWithRetry('import-softcarrier', {
          source,
          rows: rows.slice(i, i + BATCH_SIZE),
        });

        totals.created! += data.created || 0;
        totals.updated! += data.updated || 0;
        totals.success! += data.success || 0;
        totals.errors += data.errors || 0;
        totals.skipped += data.skipped || 0;
        totals.details!.push(...(data.details || []));
      }

      setLastResult(prev => ({ ...prev, [source]: totals }));

      if (totals.errors > 0) {
        toast.warning(`Import ${source} terminé avec erreurs`, {
          description: `${totals.success} succès, ${totals.errors} erreurs`,
        });
      } else {
        toast.success(`Import ${source} terminé`, {
          description: `${totals.success} éléments importés`,
        });
      }

      return totals;
    } catch (err) {
      toast.error(`Erreur import ${source}`, { description: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      setImporting(null);
      setImportProgress('');
    }
  }, []);

  return { importRows, importing, importProgress, lastResult };
};
