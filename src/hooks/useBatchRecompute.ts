import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BatchProgress {
  processed: number;
  total: number;
  errors: number;
  done: boolean;
  percent: number;
}

interface RecomputeRpcResult {
  total: number;
  processed: number;
  errors: number;
  next_offset: number;
  done: boolean;
}

export function useBatchRecompute() {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = async () => {
    setIsRunning(true);
    setProgress({ processed: 0, total: 0, errors: 0, done: false, percent: 0 });
    let offset = 0;
    const LIMIT = 500;
    let totalProcessed = 0;
    let totalErrors = 0;
    let total = 0;

    try {
      while (true) {
        const { data, error } = await supabase.rpc('admin_recompute_all_rollups', {
          p_limit: LIMIT,
          p_offset: offset,
        });
        if (error) throw error;

        const result = data as unknown as RecomputeRpcResult;
        total = result.total ?? 0;
        totalProcessed += result.processed ?? 0;
        totalErrors += result.errors ?? 0;
        offset = result.next_offset ?? offset + LIMIT;

        const pct = total > 0 ? Math.round((totalProcessed / total) * 100) : 0;
        setProgress({
          processed: totalProcessed,
          total,
          errors: totalErrors,
          done: !!result.done,
          percent: pct,
        });

        if (result.done) break;

        // Petit throttle pour ne pas saturer le backend
        await new Promise(r => setTimeout(r, 200));
      }
      toast.success(`${totalProcessed} produits trait\u00e9s \u00b7 ${totalErrors} erreur${totalErrors > 1 ? 's' : ''}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsRunning(false);
    }
  };

  return { run, isRunning, progress };
}
