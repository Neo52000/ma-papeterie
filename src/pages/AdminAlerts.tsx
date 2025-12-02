import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  usePricingAlerts, 
  useDetectOpportunities, 
  useResolveAlert,
  useAlertStats 
} from '@/hooks/usePricingAlerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Bell,
  TrendingDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminAlerts = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: stats, isLoading: statsLoading } = useAlertStats();
  const { data: alerts, isLoading: alertsLoading } = usePricingAlerts({ 
    isResolved: activeTab === 'resolved' ? true : activeTab === 'active' ? false : undefined 
  });
  const detectOpportunities = useDetectOpportunities();
  const resolveAlert = useResolveAlert();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'competitor_lower_price': return <TrendingDown className="h-4 w-4" />;
      case 'pricing_opportunity': return <TrendingUp className="h-4 w-4" />;
      case 'margin_below_threshold': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'competitor_lower_price': return 'Concurrent moins cher';
      case 'pricing_opportunity': return 'Opportunité de prix';
      case 'margin_below_threshold': return 'Marge faible';
      case 'price_change_recommended': return 'Changement recommandé';
      default: return type;
    }
  };

  const handleResolve = (alertId: string) => {
    if (user?.email) {
      resolveAlert.mutate({ alertId, resolvedBy: user.email });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertes de Pricing</h1>
          <p className="text-muted-foreground">
            Surveillance automatique des prix et opportunités
          </p>
        </div>
        <Button 
          onClick={() => detectOpportunities.mutate()}
          disabled={detectOpportunities.isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${detectOpportunities.isPending ? 'animate-spin' : ''}`} />
          Analyser maintenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alertes</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.unresolved || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Non résolues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critiques</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{stats?.critical || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Action immédiate requise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concurrents</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.byType.competitor_lower_price || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Prix plus bas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunités</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.byType.pricing_opportunity || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Amélioration marge
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Alertes</CardTitle>
          <CardDescription>
            Toutes les alertes de pricing détectées automatiquement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="active">Actives</TabsTrigger>
              <TabsTrigger value="resolved">Résolues</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : alerts && alerts.length > 0 ? (
                alerts.map((alert) => (
                  <Alert key={alert.id} className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getAlertTypeIcon(alert.alert_type)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">
                              {getAlertTypeLabel(alert.alert_type)}
                            </Badge>
                            {alert.competitor_name && (
                              <Badge variant="secondary">
                                {alert.competitor_name}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(alert.created_at), { 
                                addSuffix: true,
                                locale: fr 
                              })}
                            </span>
                          </div>
                          
                          <AlertDescription className="text-sm">
                            {alert.details?.product_name && (
                              <div className="font-medium mb-1">
                                {alert.details.product_name}
                              </div>
                            )}
                            {alert.suggested_action}
                          </AlertDescription>

                          {(alert.our_price || alert.competitor_price) && (
                            <div className="flex gap-4 text-sm">
                              {alert.our_price && (
                                <div>
                                  <span className="text-muted-foreground">Notre prix: </span>
                                  <span className="font-medium">{alert.our_price.toFixed(2)}€</span>
                                </div>
                              )}
                              {alert.competitor_price && (
                                <div>
                                  <span className="text-muted-foreground">Concurrent: </span>
                                  <span className="font-medium">{alert.competitor_price.toFixed(2)}€</span>
                                </div>
                              )}
                              {alert.price_difference_percent && (
                                <div>
                                  <span className="text-muted-foreground">Écart: </span>
                                  <span className={`font-medium ${alert.price_difference_percent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {alert.price_difference_percent > 0 ? '+' : ''}{alert.price_difference_percent.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {alert.is_resolved && alert.resolved_by && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Résolu par {alert.resolved_by}
                            </div>
                          )}
                        </div>
                      </div>

                      {!alert.is_resolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolveAlert.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Résoudre
                        </Button>
                      )}
                    </div>
                  </Alert>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune alerte trouvée
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAlerts;