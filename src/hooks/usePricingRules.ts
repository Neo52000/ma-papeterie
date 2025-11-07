import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  priority: number;
  category?: string;
  product_ids?: string[];
  supplier_ids?: string[];
  strategy: 'margin_target' | 'competitor_match' | 'competitor_undercut' | 'hybrid';
  target_margin_percent?: number;
  min_margin_percent?: number;
  max_margin_percent?: number;
  competitor_offset_percent?: number;
  competitor_offset_fixed?: number;
  min_competitor_count?: number;
  min_price_ht?: number;
  max_price_ht?: number;
  max_price_change_percent?: number;
  require_approval?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_applied_at?: string;
}

export interface PriceAdjustment {
  id: string;
  product_id: string;
  pricing_rule_id?: string;
  old_price_ht: number;
  new_price_ht: number;
  price_change_percent: number;
  old_margin_percent?: number;
  new_margin_percent?: number;
  competitor_avg_price?: number;
  supplier_price?: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  created_at: string;
  applied_at?: string;
  applied_by?: string;
  products?: {
    name: string;
    category: string;
  };
}

export const usePricingRules = () => {
  return useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as PricingRule[];
    },
  });
};

export const useCreatePricingRule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at' | 'last_applied_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('pricing_rules')
        .insert([{ ...rule, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast({
        title: "Règle créée",
        description: "La règle de pricing a été créée avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de créer la règle: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePricingRule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast({
        title: "Règle mise à jour",
        description: "La règle de pricing a été mise à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour la règle: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeletePricingRule = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      toast({
        title: "Règle supprimée",
        description: "La règle de pricing a été supprimée avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de supprimer la règle: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const usePriceAdjustments = (status?: string) => {
  return useQuery({
    queryKey: ['price-adjustments', status],
    queryFn: async () => {
      let query = supabase
        .from('price_adjustments')
        .select(`
          *,
          products (
            name,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PriceAdjustment[];
    },
  });
};

export const useApplyPriceAdjustment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adjustmentId, approve }: { adjustmentId: string; approve: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Update adjustment status
      const { data: adjustment, error: updateError } = await supabase
        .from('price_adjustments')
        .update({
          status: approve ? 'approved' : 'rejected',
          applied_by: user.id,
          applied_at: new Date().toISOString(),
        })
        .eq('id', adjustmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If approved, update the product price
      if (approve) {
        const { error: productError } = await supabase
          .from('products')
          .update({ price_ht: adjustment.new_price_ht })
          .eq('id', adjustment.product_id);

        if (productError) throw productError;
      }

      return adjustment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['price-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: variables.approve ? "Prix appliqué" : "Ajustement rejeté",
        description: variables.approve 
          ? "Le nouveau prix a été appliqué au produit"
          : "L'ajustement de prix a été rejeté",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible d'appliquer l'ajustement: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useCalculatePriceAdjustments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId?: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-price-adjustments', {
        body: { ruleId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['price-adjustments'] });
      toast({
        title: "Calcul terminé",
        description: `${data.adjustmentsCount || 0} ajustements de prix proposés`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de calculer les ajustements: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
