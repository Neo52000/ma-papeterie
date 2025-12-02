import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PricingAlert {
  id: string;
  alert_type: 'competitor_lower_price' | 'pricing_opportunity' | 'margin_below_threshold' | 'price_change_recommended';
  severity: 'low' | 'medium' | 'high' | 'critical';
  product_id: string;
  competitor_name?: string;
  our_price?: number;
  competitor_price?: number;
  price_difference?: number;
  price_difference_percent?: number;
  suggested_action?: string;
  details?: any;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export const usePricingAlerts = (filters?: { 
  isResolved?: boolean; 
  severity?: string;
  alertType?: string;
}) => {
  return useQuery({
    queryKey: ['pricing-alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('pricing_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.isResolved !== undefined) {
        query = query.eq('is_resolved', filters.isResolved);
      }
      
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters?.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PricingAlert[];
    },
  });
};

export const useDetectOpportunities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detect-pricing-opportunities');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-alerts'] });
      toast.success(data.message || 'Analyse des opportunités terminée');
    },
    onError: (error: Error) => {
      console.error('Error detecting opportunities:', error);
      toast.error('Erreur lors de l\'analyse des opportunités');
    }
  });
};

export const useMarkAlertAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('pricing_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-alerts'] });
    },
    onError: (error: Error) => {
      console.error('Error marking alert as read:', error);
      toast.error('Erreur lors de la mise à jour de l\'alerte');
    }
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, resolvedBy }: { alertId: string; resolvedBy: string }) => {
      const { error } = await supabase
        .from('pricing_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-alerts'] });
      toast.success('Alerte résolue');
    },
    onError: (error: Error) => {
      console.error('Error resolving alert:', error);
      toast.error('Erreur lors de la résolution de l\'alerte');
    }
  });
};

export const useAlertStats = () => {
  return useQuery({
    queryKey: ['pricing-alerts-stats'],
    queryFn: async () => {
      const { data: alerts, error } = await supabase
        .from('pricing_alerts')
        .select('severity, is_resolved, alert_type');

      if (error) throw error;

      const total = alerts?.length || 0;
      const unresolved = alerts?.filter(a => !a.is_resolved).length || 0;
      const critical = alerts?.filter(a => a.severity === 'critical' && !a.is_resolved).length || 0;
      const high = alerts?.filter(a => a.severity === 'high' && !a.is_resolved).length || 0;

      return {
        total,
        unresolved,
        critical,
        high,
        byType: {
          competitor_lower_price: alerts?.filter(a => a.alert_type === 'competitor_lower_price' && !a.is_resolved).length || 0,
          pricing_opportunity: alerts?.filter(a => a.alert_type === 'pricing_opportunity' && !a.is_resolved).length || 0,
          margin_below_threshold: alerts?.filter(a => a.alert_type === 'margin_below_threshold' && !a.is_resolved).length || 0,
        }
      };
    }
  });
};