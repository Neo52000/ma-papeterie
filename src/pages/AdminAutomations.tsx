import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Bot, Store, Search, Zap, Truck, Brain, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const AUTOMATIONS = [
  {
    id: "sync-shopify",
    name: "Sync Shopify",
    description: "Pousse les produits vendables vers Shopify (prix, stock, images)",
    icon: Store,
    agent: "sync-shopify",
    category: "shopify",
  },
  {
    id: "agent-seo",
    name: "Agent SEO",
    description: "Génère descriptions, meta tags et données structurées par IA",
    icon: Search,
    agent: "agent-seo",
    category: "ia",
  },
  {
    id: "detect-exceptions",
    name: "Détection Exceptions",
    description: "Scan tous les produits pour EAN manquant, doublons, prix invalides",
    icon: AlertTriangle,
    agent: "detect-exceptions",
    category: "qualité",
    isRpc: true,
  },
  {
    id: "auto-purchase-orders",
    name: "Commandes Auto",
    description: "Génère les commandes fournisseurs pour les produits sous seuil de stock",
    icon: Truck,
    agent: "auto-purchase-orders",
    category: "stock",
  },
  {
    id: "optimize-reorder",
    name: "Intelligence Réassort",
    description: "Analyse IA de la vélocité de ventes et stocks pour suggérer des réapprovisionnements optimaux",
    icon: Brain,
    agent: "optimize-reorder",
    category: "ia",
  },
  {
    id: "detect-pricing-opportunities",
    name: "Surveillance Prix Avancée",
    description: "Détection d'opportunités de pricing et analyse concurrentielle par IA",
    icon: TrendingUp,
    agent: "detect-pricing-opportunities",
    category: "ia",
  },
];

export default function AdminAutomations() {
  const queryClient = useQueryClient();

  const { data: agentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["agent-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: cronLogs } = useQuery({
    queryKey: ["cron-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cron_job_logs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: shopifySyncLogs } = useQuery({
    queryKey: ["shopify-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopify_sync_log")
        .select("*")
        .order("synced_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const runAutomation = useMutation({
    mutationFn: async (automationId: string) => {
      const automation = AUTOMATIONS.find(a => a.id === automationId);
      if (!automation) throw new Error("Unknown automation");

      if (automation.isRpc) {
        const { data, error } = await supabase.rpc("detect_all_product_exceptions");
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase.functions.invoke(automationId, {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, automationId) => {
      toast.success(`${automationId} exécuté avec succès`, {
        description: JSON.stringify(data).substring(0, 100),
      });
      queryClient.invalidateQueries({ queryKey: ["agent-logs"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-sync-logs"] });
    },
    onError: (error: any, automationId) => {
      toast.error(`Erreur ${automationId}`, { description: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-primary/10 text-primary"><CheckCircle className="h-3 w-3 mr-1" />Succès</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erreur</Badge>;
      case "partial":
        return <Badge className="bg-accent text-accent-foreground"><AlertTriangle className="h-3 w-3 mr-1" />Partiel</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Stats from logs
  const todayLogs = agentLogs?.filter(l => {
    const d = new Date(l.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }) || [];

  const successCount = todayLogs.filter(l => l.status === "success").length;
  const errorCount = todayLogs.filter(l => l.status === "error").length;

  return (
    <AdminLayout title="Automatisations & Agents IA" description="Gestion centralisée des automatisations, agents IA et synchronisations">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{todayLogs.length}</p>
                  <p className="text-sm text-muted-foreground">Exécutions aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{successCount}</p>
                  <p className="text-sm text-muted-foreground">Succès</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{errorCount}</p>
                  <p className="text-sm text-muted-foreground">Erreurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{AUTOMATIONS.length}</p>
                  <p className="text-sm text-muted-foreground">Agents actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="agents">
          <TabsList>
            <TabsTrigger value="agents">Agents & Actions</TabsTrigger>
            <TabsTrigger value="logs">Logs Agents</TabsTrigger>
            <TabsTrigger value="shopify">Sync Shopify</TabsTrigger>
            <TabsTrigger value="cron">Tâches Planifiées</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AUTOMATIONS.map((auto) => {
                const Icon = auto.icon;
                const isRunning = runAutomation.isPending && runAutomation.variables === auto.id;
                const lastRun = agentLogs?.find(l => l.agent_name === auto.agent);
                return (
                  <Card key={auto.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{auto.name}</CardTitle>
                        </div>
                        <Badge variant="outline">{auto.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{auto.description}</p>
                      {lastRun && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Dernier : {format(new Date(lastRun.created_at), "dd/MM HH:mm", { locale: fr })}
                          {" "}{getStatusBadge(lastRun.status)}
                        </div>
                      )}
                      <Button
                        className="w-full"
                        onClick={() => runAutomation.mutate(auto.id)}
                        disabled={isRunning}
                      >
                        {isRunning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                        {isRunning ? "En cours..." : "Exécuter"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Historique des exécutions</CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead>Détails</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentLogs?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.agent_name}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>{log.duration_ms ? `${log.duration_ms}ms` : "-"}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs">
                            {log.error_message || JSON.stringify(log.output_data || {}).substring(0, 80)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shopify">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Historique Sync Shopify</CardTitle>
                  <Button onClick={() => runAutomation.mutate("sync-shopify")} disabled={runAutomation.isPending}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${runAutomation.isPending ? 'animate-spin' : ''}`} />
                    Synchroniser maintenant
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit ID</TableHead>
                      <TableHead>Shopify ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Erreur</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shopifySyncLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{log.product_id?.substring(0, 8)}...</TableCell>
                        <TableCell>{log.shopify_product_id || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.sync_type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-destructive">
                          {log.error_message || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(log.synced_at), "dd/MM HH:mm", { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cron">
            <Card>
              <CardHeader>
                <CardTitle>Tâches planifiées (CRON)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>detect-product-exceptions</strong> : tous les jours à 3h00 — détecte les anomalies produits</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cronLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.job_name}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{log.duration_ms ? `${log.duration_ms}ms` : "-"}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs">
                          {log.error_message || JSON.stringify(log.result || {}).substring(0, 80)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(log.executed_at), "dd/MM HH:mm:ss", { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!cronLogs || cronLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Aucun log cron disponible — les tâches planifiées s'exécutent automatiquement
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
