import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Cell, Pie, Legend } from "recharts";
import DataProcessingRegister from "@/components/gdpr/DataProcessingRegister";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function AdminGDPR() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: requests, isLoading, refetch } = useAllGdprRequests({ status: statusFilter });
  const { data: stats, isLoading: statsLoading } = useGdprStats();
  const { data: cronLogs } = useCronJobLogs();
  const updateRequest = useUpdateGdprRequest();

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

  return (
    <AdminLayout 
      title="Dashboard RGPD" 
      description="Conformité et gestion des données personnelles"
    >
      <div className="flex justify-end mb-6">
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="h-4 w-4" />
            Demandes
          </TabsTrigger>
          <TabsTrigger value="register" className="gap-2">
            <Shield className="h-4 w-4" />
            Registre Art.30
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

          <div className="grid md:grid-cols-2 gap-6">
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
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-full">
                            {getTypeIcon(request.request_type)}
                          </div>
                          <div>
                            <p className="font-medium">{getTypeLabel(request.request_type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(request.requested_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            onClick={() => handleProcess(request.id, 'processing')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Traiter
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleProcess(request.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucune demande trouvée
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Register Tab */}
        <TabsContent value="register">
          <DataProcessingRegister />
        </TabsContent>

        {/* Consents Tab */}
        <TabsContent value="consents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques des consentements</CardTitle>
              <CardDescription>Vue d'ensemble des consentements utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={consentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs des tâches automatiques</CardTitle>
              <CardDescription>Historique des exécutions des jobs RGPD</CardDescription>
            </CardHeader>
            <CardContent>
              {cronLogs && cronLogs.length > 0 ? (
                <div className="space-y-2">
                  {cronLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status}
                        </Badge>
                        <span className="font-medium">{log.job_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {log.duration_ms && <span>{log.duration_ms}ms</span>}
                        <span>{format(new Date(log.executed_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun log disponible
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
