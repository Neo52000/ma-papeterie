import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertCircle, Lightbulb, Target, Loader2 } from "lucide-react";
import { useSalesPredictions, type SalesAnalysis } from "@/hooks/useSalesPredictions";

export default function AdminSalesPredictions() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'optimize'>('forecast');
  const [analysis, setAnalysis] = useState<SalesAnalysis | null>(null);
  
  const predictSales = useSalesPredictions();

  const handleAnalyze = async () => {
    const result = await predictSales.mutateAsync({ analysisType: activeTab });
    if (result.success) {
      setAnalysis(result.analysis);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = (confidence?: 'low' | 'medium' | 'high') => {
    if (!confidence) return null;
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'default',
    } as const;
    return <Badge variant={variants[confidence]}>{confidence === 'low' ? 'Faible' : confidence === 'medium' ? 'Moyen' : 'Élevé'}</Badge>;
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-blue-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prévisions & Optimisation IA</h1>
          <p className="text-muted-foreground">
            Prévisions de ventes et recommandations de pricing optimisées par intelligence artificielle
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={predictSales.isPending}
          size="lg"
        >
          {predictSales.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Générer l'analyse IA
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'forecast' | 'optimize')}>
        <TabsList>
          <TabsTrigger value="forecast">Prévisions de ventes</TabsTrigger>
          <TabsTrigger value="optimize">Optimisation des prix</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-6">
          {!analysis && !predictSales.isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  Cliquez sur "Générer l'analyse IA" pour obtenir des prévisions de ventes
                </div>
              </CardContent>
            </Card>
          )}

          {analysis && activeTab === 'forecast' && (
            <>
              {/* Résumé */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Résumé de l'analyse</AlertTitle>
                <AlertDescription>{analysis.summary}</AlertDescription>
              </Alert>

              {/* Métriques clés */}
              {analysis.metrics && analysis.metrics.length > 0 && (
                <div className="grid gap-4 md:grid-cols-4">
                  {analysis.metrics.map((metric, index) => (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                        {getTrendIcon(metric.trend)}
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metric.value}</div>
                        {metric.description && (
                          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Graphique de prévisions */}
              {analysis.forecasts && analysis.forecasts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prévisions de ventes (3 prochains mois)</CardTitle>
                    <CardDescription>Volume de ventes et revenus prévisionnels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analysis.forecasts}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="predictedSales"
                          stroke="hsl(var(--primary))"
                          name="Ventes prévues"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="predictedRevenue"
                          stroke="hsl(var(--accent))"
                          name="Revenu prévu (€)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="optimize" className="space-y-6">
          {!analysis && !predictSales.isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  Cliquez sur "Générer l'analyse IA" pour obtenir des recommandations d'optimisation
                </div>
              </CardContent>
            </Card>
          )}

          {analysis && activeTab === 'optimize' && (
            <>
              {/* Résumé */}
              <Alert>
                <Target className="h-4 w-4" />
                <AlertTitle>Stratégie recommandée</AlertTitle>
                <AlertDescription>{analysis.summary}</AlertDescription>
              </Alert>

              {/* Métriques clés */}
              {analysis.metrics && analysis.metrics.length > 0 && (
                <div className="grid gap-4 md:grid-cols-4">
                  {analysis.metrics.map((metric, index) => (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                        {getTrendIcon(metric.trend)}
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metric.value}</div>
                        {metric.description && (
                          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Recommandations de prix */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommandations de prix</CardTitle>
                    <CardDescription>
                      Ajustements suggérés pour optimiser les marges
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{rec.productName}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  Prix actuel: {rec.currentPrice.toFixed(2)} €
                                </span>
                                <span className="text-sm font-semibold text-primary">
                                  → Prix recommandé: {rec.recommendedPrice.toFixed(2)} €
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {rec.expectedMarginChange !== undefined && (
                                <Badge variant={rec.expectedMarginChange > 0 ? 'default' : 'secondary'}>
                                  {rec.expectedMarginChange > 0 ? '+' : ''}{rec.expectedMarginChange.toFixed(1)}% marge
                                </Badge>
                              )}
                              {getConfidenceBadge(rec.confidence)}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Insights */}
      {analysis && analysis.insights && analysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Insights clés
            </CardTitle>
            <CardDescription>Points d'attention et opportunités identifiés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${getPriorityColor(insight.priority)}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'secondary'}>
                        {insight.priority === 'high' ? 'Prioritaire' : insight.priority === 'medium' ? 'Important' : 'Info'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
