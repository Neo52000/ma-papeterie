import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerAnalytics } from '@/components/crm/CustomerAnalytics';
import { CustomerSegmentation } from '@/components/crm/CustomerSegmentation';
import { BarChart3, Users, Sparkles, Target, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminCRM() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [isCalculatingRFM, setIsCalculatingRFM] = useState(false);
  const [rfmScores, setRfmScores] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isSuperAdmin))) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, isSuperAdmin, navigate]);

  useEffect(() => {
    if (user && (isAdmin || isSuperAdmin)) {
      fetchRFMScores();
    }
  }, [user, isAdmin, isSuperAdmin]);

  const fetchRFMScores = async () => {
    const { data, error } = await supabase
      .from('customer_rfm_scores')
      .select('*')
      .order('total_spent', { ascending: false })
      .limit(10);

    if (!error && data) {
      setRfmScores(data);
    }
  };

  const handleCalculateRFM = async () => {
    setIsCalculatingRFM(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-rfm-scores');
      
      if (error) throw error;
      
      toast.success(`Scores RFM calculés pour ${data.processed} clients`);
      fetchRFMScores();
    } catch (error) {
      console.error('Error calculating RFM:', error);
      toast.error('Erreur lors du calcul des scores RFM');
    } finally {
      setIsCalculatingRFM(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!user || (!isAdmin && !isSuperAdmin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">CRM - Gestion Client</h1>
          <p className="text-muted-foreground">Analytics, segmentation et suivi des clients</p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="segmentation">
              <Users className="h-4 w-4 mr-2" />
              Segmentation
            </TabsTrigger>
            <TabsTrigger value="rfm">
              <Target className="h-4 w-4 mr-2" />
              Scores RFM
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              Prédictions IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <CustomerAnalytics />
          </TabsContent>

          <TabsContent value="segmentation">
            <CustomerSegmentation />
          </TabsContent>

          <TabsContent value="rfm" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Scores RFM</h2>
                <p className="text-muted-foreground">Récence, Fréquence, Montant</p>
              </div>
              <Button onClick={handleCalculateRFM} disabled={isCalculatingRFM}>
                {isCalculatingRFM ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Calculer les scores
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-4">
              {rfmScores.map((score) => (
                <Card key={score.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{score.rfm_segment || 'Client'}</CardTitle>
                    <CardDescription>
                      R: {score.recency_score} | F: {score.frequency_score} | M: {score.monetary_score}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Commandes</p>
                        <p className="font-semibold">{score.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dépensé</p>
                        <p className="font-semibold">{score.total_spent?.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Panier moyen</p>
                        <p className="font-semibold">{score.avg_order_value?.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Risque churn</p>
                        <p className="font-semibold">{score.churn_risk?.toFixed(0)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>Prédictions IA</CardTitle>
                <CardDescription>Analyse prédictive et recommandations intelligentes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Fonctionnalité en cours de développement</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
