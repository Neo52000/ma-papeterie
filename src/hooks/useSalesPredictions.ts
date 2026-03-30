import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PredictionMetric {
  name: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  description?: string;
}

export interface PriceRecommendation {
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  expectedMarginChange?: number;
  confidence?: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface SalesForecast {
  month: string;
  predictedSales: number;
  predictedRevenue: number;
  confidence?: 'low' | 'medium' | 'high';
}

export interface Insight {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SalesAnalysis {
  summary: string;
  metrics?: PredictionMetric[];
  recommendations?: PriceRecommendation[];
  forecasts?: SalesForecast[];
  insights: Insight[];
}

export const useSalesPredictions = () => {

  return useMutation({
    mutationFn: async ({ 
      productId, 
      analysisType 
    }: { 
      productId?: string; 
      analysisType: 'forecast' | 'optimize' 
    }) => {
      const { data, error } = await supabase.functions.invoke('predict-sales', {
        body: { productId, analysisType }
      });

      if (error) throw error;
      return data as { success: boolean; analysis: SalesAnalysis; generatedAt: string };
    },
    onSuccess: () => {
      toast.success('Les prÃ©visions et recommandations ont Ã©tÃ© gÃ©nÃ©rÃ©es avec succÃ¨s');
    },
    onError: (error: Error) => {
      if (error.message.includes('429')) {
        toast.error('Trop de requÃªtes, veuillez rÃ©essayer plus tard.');
      } else if (error.message.includes('402')) {
        toast.error('CrÃ©dits AI insuffisants. Veuillez vÃ©rifier votre configuration.');
      } else {
        toast.error(`Impossible de gÃ©nÃ©rer l'analyse: ${error.message}`);
      }
    },
  });
};
