import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Clock, CheckCircle, XCircle, Download, Trash2, Eye, RefreshCw } from "lucide-react";
import { useAllGdprRequests, useUpdateGdprRequest } from "@/hooks/useGdprRequests";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminGDPR() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: requests, isLoading, refetch } = useAllGdprRequests({ status: statusFilter });
  const updateRequest = useUpdateGdprRequest();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">En attente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">En cours</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Terminé</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600">Rejeté</Badge>;
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

  const stats = {
    total: requests?.length || 0,
    pending: requests?.filter(r => r.status === 'pending').length || 0,
    processing: requests?.filter(r => r.status === 'processing').length || 0,
    completed: requests?.filter(r => r.status === 'completed').length || 0
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Demandes RGPD</h1>
            <p className="text-muted-foreground">Gérez les demandes de protection des données</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total demandes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.processing}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
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

        {/* Requests list */}
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
      </main>

      <Footer />
    </div>
  );
}