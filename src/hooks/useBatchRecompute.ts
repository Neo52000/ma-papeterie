import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BatchProgress {
  processed: number;
  total: number;
  errors: number;
  done: boolean;
  percent: number;
}

export function useBatchRecompute() {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

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
        const { data, error } = await supabase.rpc('admin_recompute_all_rollups' as any, {
          p_limit: LIMIT,
          p_offset: offset,
        });
        if (error) throw error;

        total = (data as any).total ?? 0;
        totalProcessed += (data as any).processed ?? 0;
        totalErrors += (data as any).errors ?? 0;
        offset = (data as any).next_offset ?? offset + LIMIT;

        const pct = total > 0 ? Math.round((totalProcessed / total) * 100) : 0;
        setProgress({
          processed: totalProcessed,
          total,
          errors: totalErrors,
          done: !!(data as any).done,
          percent: pct,
        });

        if ((data as any).done) break;

        // Petit throttle pour ne pas saturer le backend
        await new Promise(r => setTimeout(r, 200));
      }
      toast({
        title: "Recalcul terminé",
        description: `${totalProcessed} produits traités · ${totalErrors} erreur${totalErrors > 1 ? 's' : ''}`,
      });
    } catch (e: any) {
      toast({ title: "Erreur recalcul", description: e.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  return { run, isRunning, progress };
}
