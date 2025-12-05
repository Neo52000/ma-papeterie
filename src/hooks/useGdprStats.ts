import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GdprStats {
  totalRequests: number;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;
  rejectedRequests: number;
  exportRequests: number;
  deletionRequests: number;
  accessRequests: number;
  avgProcessingDays: number;
  complianceRate: number;
  requestsByMonth: { month: string; count: number }[];
  consentStats: {
    essential: number;
    analytics: number;
    marketing: number;
    total: number;
  };
  retentionLogs: number;
}

export function useGdprStats() {
  return useQuery({
    queryKey: ['gdpr-stats'],
    queryFn: async (): Promise<GdprStats> => {
      // Fetch GDPR requests
      const { data: requests, error: reqError } = await supabase
        .from('gdpr_requests')
        .select('*');

      if (reqError) throw reqError;

      // Fetch user consents
      const { data: consents, error: consentError } = await supabase
        .from('user_consents')
        .select('*');

      if (consentError) throw consentError;

      // Fetch data retention logs
      const { data: retentionLogs, error: retentionError } = await supabase
        .from('data_retention_logs')
        .select('*');

      if (retentionError) throw retentionError;

      const allRequests = requests || [];
      const allConsents = consents || [];
      
      // Calculate stats
      const pending = allRequests.filter(r => r.status === 'pending');
      const processing = allRequests.filter(r => r.status === 'processing');
      const completed = allRequests.filter(r => r.status === 'completed');
      const rejected = allRequests.filter(r => r.status === 'rejected');

      // Calculate average processing time for completed requests
      let avgProcessingDays = 0;
      if (completed.length > 0) {
        const totalDays = completed.reduce((acc, req) => {
          if (req.processed_at && req.requested_at) {
            const diff = new Date(req.processed_at).getTime() - new Date(req.requested_at).getTime();
            return acc + (diff / (1000 * 60 * 60 * 24));
          }
          return acc;
        }, 0);
        avgProcessingDays = Math.round((totalDays / completed.length) * 10) / 10;
      }

      // Calculate compliance rate (requests processed within 30 days)
      const processedRequests = [...completed, ...rejected];
      const compliantRequests = processedRequests.filter(req => {
        if (req.processed_at && req.requested_at) {
          const diff = new Date(req.processed_at).getTime() - new Date(req.requested_at).getTime();
          return diff <= 30 * 24 * 60 * 60 * 1000;
        }
        return false;
      });
      const complianceRate = processedRequests.length > 0 
        ? Math.round((compliantRequests.length / processedRequests.length) * 100) 
        : 100;

      // Requests by month (last 6 months)
      const now = new Date();
      const requestsByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const count = allRequests.filter(r => {
          const reqDate = new Date(r.requested_at);
          return reqDate.getMonth() === date.getMonth() && reqDate.getFullYear() === date.getFullYear();
        }).length;
        requestsByMonth.push({ month: monthStr, count });
      }

      // Consent stats
      const consentStats = {
        essential: allConsents.filter(c => c.consent_type === 'cookies_essential' && c.consented).length,
        analytics: allConsents.filter(c => c.consent_type === 'cookies_analytics' && c.consented).length,
        marketing: allConsents.filter(c => c.consent_type === 'cookies_marketing' && c.consented).length,
        total: allConsents.length
      };

      return {
        totalRequests: allRequests.length,
        pendingRequests: pending.length,
        processingRequests: processing.length,
        completedRequests: completed.length,
        rejectedRequests: rejected.length,
        exportRequests: allRequests.filter(r => r.request_type === 'export').length,
        deletionRequests: allRequests.filter(r => r.request_type === 'deletion').length,
        accessRequests: allRequests.filter(r => r.request_type === 'access').length,
        avgProcessingDays,
        complianceRate,
        requestsByMonth,
        consentStats,
        retentionLogs: retentionLogs?.length || 0
      };
    }
  });
}

export function useCronJobLogs() {
  return useQuery({
    queryKey: ['cron-job-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    }
  });
}
