import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, AlertCircle, TrendingUp, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Recommendation {
  productId: string;
  productName: string;
  currentStock: number;
  suggestedOrder: number;
  urgency: 'high' | 'medium' | 'low';
  bestSupplier: string;
  estimatedCost: number;
  reasoning: string;
}

interface OptimizationResult {
  recommendations: Recommendation[];
  totalEstimatedCost: number;
  summary: string;
}

export const ReorderOptimization = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-reorder');

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResult(data);
      toast.success('Analyse IA terminée avec succès');
    } catch (error) {
      console.error('Error optimizing reorder:', error);
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'Urgent';
      case 'medium': return 'Moyen';
      case 'low': return 'Faible';
      default: return urgency;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Optimisation IA des Réassorts</h2>
          <p className="text-muted-foreground">
            Analyse intelligente des stocks et recommandations multi-fournisseurs
          </p>
        </div>
        <Button onClick={handleOptimize} disabled={isLoading}>
          <Sparkles className="mr-2 h-4 w-4" />
          {isLoading ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
        </Button>
      </div>

      {result && (
        <>
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Résumé :</strong> {result.summary}
              <br />
              <strong>Coût total estimé :</strong> {result.totalEstimatedCost.toFixed(2)} €
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {result.recommendations.map((rec) => (
              <Card key={rec.productId}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {rec.productName}
                      </CardTitle>
                      <CardDescription>
                        Stock actuel : {rec.currentStock} unités
                      </CardDescription>
                    </div>
                    <Badge variant={getUrgencyColor(rec.urgency)}>
                      {getUrgencyLabel(rec.urgency)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantité suggérée :</span>
                      <span className="ml-2 font-semibold">{rec.suggestedOrder} unités</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coût estimé :</span>
                      <span className="ml-2 font-semibold">{rec.estimatedCost.toFixed(2)} €</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Meilleur fournisseur :</span>
                      <span className="ml-2 font-semibold">{rec.bestSupplier}</span>
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {rec.reasoning}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!result && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Cliquez sur "Lancer l'analyse IA" pour obtenir des recommandations<br />
              de réassort optimisées par intelligence artificielle
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
