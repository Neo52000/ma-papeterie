import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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
    onSuccess: (data) => {
      toast({
        title: "Analyse terminée",
        description: "Les prévisions et recommandations ont été générées avec succès",
      });
    },
    onError: (error: Error) => {
      console.error('Prediction error:', error);
      if (error.message.includes('429')) {
        toast({
          title: "Limite atteinte",
          description: "Trop de requêtes, veuillez réessayer plus tard.",
          variant: "destructive",
        });
      } else if (error.message.includes('402')) {
        toast({
          title: "Crédits insuffisants",
          description: "Veuillez ajouter des crédits à votre compte Lovable AI.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: `Impossible de générer l'analyse: ${error.message}`,
          variant: "destructive",
        });
      }
    },
  });
};
