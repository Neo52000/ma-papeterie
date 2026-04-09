import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CronJobLog {
  id: string;
  job_name: string;
  executed_at: string;
  status: string;
  result: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
}

export function useSftpSyncLogs(jobName: string = 'sync-liderpapel-sftp') {
  return useQuery({
    queryKey: ['sftp-sync-logs', jobName],
    staleTime: 2 * 60_000,
    queryFn: async (): Promise<CronJobLog[]> => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', jobName)
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as CronJobLog[];
    },
  });
}
