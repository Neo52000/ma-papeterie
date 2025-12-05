import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, Clock, CheckCircle, XCircle, Download, Trash2, Eye, RefreshCw,
  TrendingUp, Users, FileText, AlertTriangle, BarChart3, PieChart,
  Calendar, Activity
} from "lucide-react";
import { useAllGdprRequests, useUpdateGdprRequest } from "@/hooks/useGdprRequests";
import { useGdprStats, useCronJobLogs } from "@/hooks/useGdprStats";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Cell, Pie, Legend } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminGDPR() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: requests, isLoading, refetch } = useAllGdprRequests({ status: statusFilter });
  const { data: stats, isLoading: statsLoading } = useGdprStats();
  const { data: cronLogs } = useCronJobLogs();
  const updateRequest = useUpdateGdprRequest();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">En attente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">En cours</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Terminé</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'export':
        return <Download className="h-4 w-4" />;
      case 'deletion':
        return <Trash2 className="h-4 w-4" />;
      case 'access':
        return <Eye className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'export':
        return 'Export de données';
      case 'deletion':
        return 'Suppression de compte';
      case 'access':
        return 'Accès aux données';
      case 'rectification':
        return 'Rectification';
      default:
        return type;
    }
  };

  const handleProcess = (id: string, newStatus: string) => {
    updateRequest.mutate({ id, status: newStatus });
  };

  const requestTypeData = stats ? [
    { name: 'Export', value: stats.exportRequests, color: COLORS[0] },
    { name: 'Suppression', value: stats.deletionRequests, color: COLORS[1] },
    { name: 'Accès', value: stats.accessRequests, color: COLORS[2] },
  ].filter(d => d.value > 0) : [];

  const consentData = stats ? [
    { name: 'Essentiels', value: stats.consentStats.essential },
    { name: 'Analytics', value: stats.consentStats.analytics },
    { name: 'Marketing', value: stats.consentStats.marketing },
  ] : [];

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Dashboard RGPD
            </h1>
            <p className="text-muted-foreground">Conformité et gestion des données personnelles</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <FileText className="h-4 w-4" />
              Demandes
            </TabsTrigger>
            <TabsTrigger value="consents" className="gap-2">
              <Users className="h-4 w-4" />
              Consentements
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Activity className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-full">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statsLoading ? '-' : stats?.totalRequests}</p>
                      <p className="text-sm text-muted-foreground">Total demandes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-full">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statsLoading ? '-' : stats?.pendingRequests}</p>
                      <p className="text-sm text-muted-foreground">En attente</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statsLoading ? '-' : `${stats?.complianceRate}%`}</p>
                      <p className="text-sm text-muted-foreground">Taux conformité</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-full">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statsLoading ? '-' : `${stats?.avgProcessingDays}j`}</p>
                      <p className="text-sm text-muted-foreground">Délai moyen</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Alert */}
            {stats && stats.pendingRequests > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-700">
                        {stats.pendingRequests} demande(s) en attente de traitement
                      </p>
                      <p className="text-sm text-yellow-600/80">
                        Conformément au RGPD, vous disposez de 30 jours maximum pour traiter chaque demande.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Requests by Month */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Évolution des demandes
                  </CardTitle>
                  <CardDescription>Demandes RGPD sur les 6 derniers mois</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats?.requestsByMonth || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis allowDecimals={false} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Request Types Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Types de demandes
                  </CardTitle>
                  <CardDescription>Répartition par type de demande</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : requestTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie
                          data={requestTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {requestTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statut des demandes</CardTitle>
                <CardDescription>Vue d'ensemble des demandes par statut</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Terminées
                    </span>
                    <span className="font-medium">{stats?.completedRequests || 0}</span>
                  </div>
                  <Progress 
                    value={stats?.totalRequests ? (stats.completedRequests / stats.totalRequests) * 100 : 0} 
                    className="h-2 bg-green-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      En cours
                    </span>
                    <span className="font-medium">{stats?.processingRequests || 0}</span>
                  </div>
                  <Progress 
                    value={stats?.totalRequests ? (stats.processingRequests / stats.totalRequests) * 100 : 0} 
                    className="h-2 bg-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      En attente
                    </span>
                    <span className="font-medium">{stats?.pendingRequests || 0}</span>
                  </div>
                  <Progress 
                    value={stats?.totalRequests ? (stats.pendingRequests / stats.totalRequests) * 100 : 0} 
                    className="h-2 bg-yellow-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Rejetées
                    </span>
                    <span className="font-medium">{stats?.rejectedRequests || 0}</span>
                  </div>
                  <Progress 
                    value={stats?.totalRequests ? (stats.rejectedRequests / stats.totalRequests) * 100 : 0} 
                    className="h-2 bg-red-500/20"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-muted-foreground">Filtrer par statut :</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="completed">Terminées</SelectItem>
                  <SelectItem value="rejected">Rejetées</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Liste des demandes</CardTitle>
                <CardDescription>
                  Traitez les demandes RGPD dans un délai maximum de 30 jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : requests && requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div 
                        key={request.id} 
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-muted rounded-full">
                              {getTypeIcon(request.request_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{getTypeLabel(request.request_type)}</span>
                                {getStatusBadge(request.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                ID utilisateur : {request.user_id.slice(0, 8)}...
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Demandé le {format(new Date(request.requested_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                              </p>
                              {request.processed_at && (
                                <p className="text-sm text-muted-foreground">
                                  Traité le {format(new Date(request.processed_at), "d MMMM yyyy", { locale: fr })}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleProcess(request.id, 'processing')}
                              >
                                Traiter
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleProcess(request.id, 'rejected')}
                              >
                                Rejeter
                              </Button>
                            </div>
                          )}
                          
                          {request.status === 'processing' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleProcess(request.id, 'completed')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Terminer
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune demande</h3>
                    <p className="text-muted-foreground">
                      Aucune demande RGPD n'a été soumise
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consents Tab */}
          <TabsContent value="consents" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{stats?.consentStats.essential || 0}</div>
                    <p className="text-sm text-muted-foreground mt-1">Cookies essentiels</p>
                    <p className="text-xs text-muted-foreground">Acceptés</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats?.consentStats.analytics || 0}</div>
                    <p className="text-sm text-muted-foreground mt-1">Cookies analytics</p>
                    <p className="text-xs text-muted-foreground">Acceptés</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats?.consentStats.marketing || 0}</div>
                    <p className="text-sm text-muted-foreground mt-1">Cookies marketing</p>
                    <p className="text-xs text-muted-foreground">Acceptés</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Taux d'acceptation des cookies</CardTitle>
                <CardDescription>Statistiques de consentement des utilisateurs</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={consentData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Données supprimées</CardTitle>
                <CardDescription>Historique des suppressions de données</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="text-3xl font-bold">{stats?.retentionLogs || 0}</div>
                    <p className="text-muted-foreground">Enregistrements de suppression</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Logs des jobs automatisés
                </CardTitle>
                <CardDescription>
                  Historique d'exécution des tâches planifiées (alertes pricing, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cronLogs && cronLogs.length > 0 ? (
                  <div className="space-y-3">
                    {cronLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-3 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">{log.job_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(log.executed_at), "d MMM yyyy 'à' HH:mm:ss", { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                          {log.duration_ms && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.duration_ms}ms
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun log</h3>
                    <p className="text-muted-foreground">
                      Les logs des tâches automatisées apparaîtront ici
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
