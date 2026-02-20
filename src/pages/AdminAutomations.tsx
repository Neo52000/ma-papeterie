import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Play, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Bot,
  Store, Search, Zap, Truck, Brain, TrendingUp, Activity, BarChart3, Database, Settings, Save, Loader2,
  Power, PowerOff, ChevronDown, ChevronUp, Timer, Calendar,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useBatchRecompute } from "@/hooks/useBatchRecompute";

const AUTOMATIONS = [
  { id: "sync-shopify", name: "Sync Shopify", description: "Pousse les produits vendables vers Shopify", icon: Store, agent: "sync-shopify", category: "shopify" },
  { id: "agent-seo", name: "Agent SEO", description: "Génère descriptions, meta tags et JSON-LD par IA", icon: Search, agent: "agent-seo", category: "ia" },
  { id: "detect-exceptions", name: "Détection Exceptions", description: "Scan produits : EAN manquant, doublons, prix invalides", icon: AlertTriangle, agent: "detect-exceptions", category: "qualité", isRpc: true },
  { id: "auto-purchase-orders", name: "Commandes Auto", description: "Génère les commandes fournisseurs sous seuil de stock", icon: Truck, agent: "auto-purchase-orders", category: "stock" },
  { id: "optimize-reorder", name: "Intelligence Réassort", description: "Analyse IA vélocité et stocks pour réapprovisionnement optimal", icon: Brain, agent: "optimize-reorder", category: "ia" },
  { id: "detect-pricing-opportunities", name: "Surveillance Prix", description: "Détection d'opportunités pricing et analyse concurrentielle", icon: TrendingUp, agent: "detect-pricing-opportunities", category: "ia" },
  { id: "predict-sales", name: "Prédictions Ventes", description: "Prévisions de ventes par IA", icon: Activity, agent: "predict-sales", category: "ia" },
  { id: "match-products", name: "Matching Produits", description: "Matching automatique par EAN/nom entre catalogues", icon: Search, agent: "match-products", category: "ia" },
  { id: "generate-recommendations", name: "Recommandations", description: "Recommandations produits personnalisées par IA", icon: Zap, agent: "generate-recommendations", category: "ia" },
  { id: "ai-import-catalog", name: "Import IA Catalogue", description: "Import intelligent de catalogues fournisseurs", icon: Bot, agent: "ai-import-catalog", category: "ia" },
  { id: "agent-descriptions", name: "Agent Descriptions", description: "Génère des descriptions enrichies à partir des données fournisseurs", icon: Bot, agent: "agent-descriptions", category: "ia" },
];

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function AdminAutomations() {
  const queryClient = useQueryClient();
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [daysRange, setDaysRange] = useState<number>(7);
  const { run: runBatchRecompute, isRunning: isBatchRunning, progress: batchProgress } = useBatchRecompute();

  const { data: agentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["agent-logs-full", daysRange],
    queryFn: async () => {
      const since = startOfDay(subDays(new Date(), daysRange)).toISOString();
      const { data, error } = await supabase
        .from("agent_logs")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: cronLogs } = useQuery({
    queryKey: ["cron-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cron_job_logs").select("*").order("executed_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: shopifySyncLogs } = useQuery({
    queryKey: ["shopify-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shopify_sync_log").select("*").order("synced_at", { ascending: false }).limit(30);
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
      const { data, error } = await supabase.functions.invoke(automationId, { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, automationId) => {
      toast.success(`${automationId} exécuté avec succès`, { description: JSON.stringify(data).substring(0, 100) });
      queryClient.invalidateQueries({ queryKey: ["agent-logs-full"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-sync-logs"] });
    },
    onError: (error: any, automationId) => {
      toast.error(`Erreur ${automationId}`, { description: error.message });
    },
  });

  // --- Analytics computations ---
  const agentNames = useMemo(() => {
    const names = new Set(agentLogs?.map(l => l.agent_name) || []);
    return Array.from(names).sort();
  }, [agentLogs]);

  const filteredLogs = useMemo(() => {
    if (!agentLogs) return [];
    return agentFilter === "all" ? agentLogs : agentLogs.filter(l => l.agent_name === agentFilter);
  }, [agentLogs, agentFilter]);

  // Per-agent stats
  const agentStats = useMemo(() => {
    if (!agentLogs) return [];
    const map = new Map<string, { total: number; success: number; error: number; avgMs: number; durations: number[] }>();
    for (const log of agentLogs) {
      const entry = map.get(log.agent_name) || { total: 0, success: 0, error: 0, avgMs: 0, durations: [] };
      entry.total++;
      if (log.status === "success") entry.success++;
      if (log.status === "error") entry.error++;
      if (log.duration_ms) entry.durations.push(log.duration_ms);
      map.set(log.agent_name, entry);
    }
    return Array.from(map.entries()).map(([name, s]) => ({
      name,
      total: s.total,
      success: s.success,
      error: s.error,
      successRate: s.total > 0 ? Math.round((s.success / s.total) * 100) : 0,
      avgMs: s.durations.length > 0 ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [agentLogs]);

  // Daily activity chart
  const dailyChart = useMemo(() => {
    if (!agentLogs) return [];
    const map = new Map<string, { date: string; success: number; error: number; other: number }>();
    for (const log of agentLogs) {
      const day = format(new Date(log.created_at), "dd/MM");
      const entry = map.get(day) || { date: day, success: 0, error: 0, other: 0 };
      if (log.status === "success") entry.success++;
      else if (log.status === "error") entry.error++;
      else entry.other++;
      map.set(day, entry);
    }
    return Array.from(map.values()).reverse();
  }, [agentLogs]);

  // Global pie
  const statusPie = useMemo(() => {
    const s = filteredLogs.filter(l => l.status === "success").length;
    const e = filteredLogs.filter(l => l.status === "error").length;
    const o = filteredLogs.length - s - e;
    return [
      { name: "Succès", value: s },
      { name: "Erreurs", value: e },
      { name: "Autre", value: o },
    ].filter(d => d.value > 0);
  }, [filteredLogs]);

  const todayLogs = agentLogs?.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()) || [];
  const successToday = todayLogs.filter(l => l.status === "success").length;
  const errorToday = todayLogs.filter(l => l.status === "error").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-primary/10 text-primary"><CheckCircle className="h-3 w-3 mr-1" />Succès</Badge>;
      case "error": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erreur</Badge>;
      case "partial": return <Badge className="bg-accent text-accent-foreground"><AlertTriangle className="h-3 w-3 mr-1" />Partiel</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Agents IA & Automatisations" description="Tableau de bord centralisé de tous les agents IA, automatisations et synchronisations">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Bot className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{AUTOMATIONS.length}</p><p className="text-xs text-muted-foreground">Agents configurés</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Zap className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{todayLogs.length}</p><p className="text-xs text-muted-foreground">Exécutions aujourd'hui</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{successToday}</p><p className="text-xs text-muted-foreground">Succès aujourd'hui</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><XCircle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{errorToday}</p><p className="text-xs text-muted-foreground">Erreurs aujourd'hui</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{agentLogs?.length || 0}</p><p className="text-xs text-muted-foreground">Logs ({daysRange}j)</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard">📊 Dashboard IA</TabsTrigger>
            <TabsTrigger value="agents">⚡ Agents & Actions</TabsTrigger>
            <TabsTrigger value="recompute">🔄 Recalcul Rollups</TabsTrigger>
            <TabsTrigger value="logs">📋 Logs détaillés</TabsTrigger>
            <TabsTrigger value="shopify">🛒 Sync Shopify</TabsTrigger>
            <TabsTrigger value="cron">⏰ Tâches Planifiées</TabsTrigger>
            <TabsTrigger value="settings">⚙️ Paramètres</TabsTrigger>
          </TabsList>

          {/* NEW: Dashboard IA */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Période :</span>
              <Select value={daysRange.toString()} onValueChange={(v) => setDaysRange(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Aujourd'hui</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="14">14 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Activity Chart */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Activité quotidienne</CardTitle></CardHeader>
                <CardContent>
                  {dailyChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dailyChart}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="success" name="Succès" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="error" name="Erreurs" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-12">Aucune donnée sur cette période</p>
                  )}
                </CardContent>
              </Card>

              {/* Status Pie */}
              <Card>
                <CardHeader><CardTitle className="text-base">Répartition statuts</CardTitle></CardHeader>
                <CardContent>
                  {statusPie.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-12">Aucune donnée</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Per-agent table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Performance par agent</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Exécutions</TableHead>
                      <TableHead className="text-right">Succès</TableHead>
                      <TableHead className="text-right">Erreurs</TableHead>
                      <TableHead className="text-right">Taux succès</TableHead>
                      <TableHead className="text-right">Durée moy.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentStats.map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.total}</TableCell>
                        <TableCell className="text-right text-primary">{s.success}</TableCell>
                        <TableCell className="text-right text-destructive">{s.error}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.successRate >= 90 ? "default" : s.successRate >= 50 ? "secondary" : "destructive"}>
                            {s.successRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{s.avgMs ? `${s.avgMs}ms` : "-"}</TableCell>
                      </TableRow>
                    ))}
                    {agentStats.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun log disponible</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recalcul Rollups */}
          <TabsContent value="recompute" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Recalcul global prix public & disponibilité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Recalcule <code className="bg-muted px-1 rounded text-xs">public_price_ttc</code> et <code className="bg-muted px-1 rounded text-xs">is_available</code> pour tous les produits actifs selon les offres fournisseurs actives (<code className="bg-muted px-1 rounded text-xs">supplier_offers</code>).
                </p>
                <Button onClick={runBatchRecompute} disabled={isBatchRunning} className="gap-2">
                  {isBatchRunning
                    ? <><RefreshCw className="h-4 w-4 animate-spin" />Recalcul en cours...</>
                    : <><Play className="h-4 w-4" />Lancer le recalcul</>}
                </Button>
                {batchProgress && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {batchProgress.processed} / {batchProgress.total} produits
                        {batchProgress.errors > 0 && (
                          <span className="text-destructive ml-2">· {batchProgress.errors} erreur{batchProgress.errors > 1 ? 's' : ''}</span>
                        )}
                      </span>
                      <span className="font-semibold">{batchProgress.percent}%</span>
                    </div>
                    <Progress value={batchProgress.percent} className="h-3" />
                    {batchProgress.done && (
                      <Badge className="bg-primary/10 text-primary gap-1">
                        <CheckCircle className="h-3 w-3" />Terminé — {batchProgress.processed} produits recalculés
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents & Actions */}
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
                      <Button className="w-full" onClick={() => runAutomation.mutate(auto.id)} disabled={isRunning}>
                        {isRunning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                        {isRunning ? "En cours..." : "Exécuter"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Logs détaillés */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>Historique des exécutions</CardTitle>
                  <Select value={agentFilter} onValueChange={setAgentFilter}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par agent" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les agents</SelectItem>
                      {agentNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
                      {filteredLogs.map((log) => (
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
                      {filteredLogs.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun log trouvé</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shopify */}
          <TabsContent value="shopify">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Historique Sync Shopify</CardTitle>
                  <Button onClick={() => runAutomation.mutate("sync-shopify")} disabled={runAutomation.isPending}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${runAutomation.isPending ? 'animate-spin' : ''}`} />
                    Synchroniser
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
                        <TableCell><Badge variant="outline">{log.sync_type}</Badge></TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-destructive">{log.error_message || "-"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(log.synced_at), "dd/MM HH:mm", { locale: fr })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CRON */}
          <TabsContent value="cron">
            <CronJobsPanel />
          </TabsContent>

          {/* ── PARAMÈTRES app_settings ── */}
          <TabsContent value="settings">
            <AppSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ─── AppSettingsPanel component ──────────────────────────────────────────────
const SETTINGS_SCHEMA = [
  {
    key: 'ghost_offer_threshold_alkor_days',
    label: 'Seuil offres fantômes ALKOR (jours)',
    description: 'Nombre de jours sans visibilité avant de marquer une offre ALKOR inactive',
    type: 'number' as const,
    min: 1, max: 30, defaultValue: 3,
  },
  {
    key: 'ghost_offer_threshold_comlandi_days',
    label: 'Seuil offres fantômes COMLANDI (jours)',
    description: 'Nombre de jours sans visibilité avant de marquer une offre COMLANDI inactive',
    type: 'number' as const,
    min: 1, max: 30, defaultValue: 3,
  },
  {
    key: 'ghost_offer_threshold_soft_days',
    label: 'Seuil offres fantômes SOFT (jours)',
    description: 'Nombre de jours sans visibilité avant de marquer une offre SOFT inactive',
    type: 'number' as const,
    min: 1, max: 30, defaultValue: 8,
  },
  {
    key: 'nightly_rollup_enabled',
    label: 'Cron nightly rollup activé',
    description: 'Active le recalcul automatique prix/stock chaque nuit à 2h30',
    type: 'boolean' as const,
    defaultValue: true,
  },
];

function AppSettingsPanel() {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, string | number | boolean>>({});
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('key, value, label, description, updated_at');
      if (error) throw error;
      return data;
    },
  });

  const getVal = (key: string, schema: typeof SETTINGS_SCHEMA[number]): string | number | boolean => {
    // Local override first
    if (key in localValues) return localValues[key];
    const row = settings?.find(s => s.key === key);
    if (!row) return schema.defaultValue;
    if (schema.type === 'boolean') return row.value === true || row.value === 'true';
    return Number(row.value) || schema.defaultValue;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = SETTINGS_SCHEMA.map(schema => {
        const val = getVal(schema.key, schema);
        return {
          key: schema.key,
          value: JSON.parse(JSON.stringify(val)),
          label: schema.label,
          description: schema.description,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase.from('app_settings').upsert(upserts, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Paramètres sauvegardés');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (err: any) => toast.error('Erreur sauvegarde', { description: err.message }),
  });

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Paramètres système</CardTitle>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : saved
              ? <CheckCircle className="h-4 w-4" />
              : <Save className="h-4 w-4" />}
            {saveMutation.isPending ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Ghost offer thresholds */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Offres fantômes</h3>
            <div className="space-y-4">
              {SETTINGS_SCHEMA.filter(s => s.type === 'number').map(schema => {
                const val = getVal(schema.key, schema) as number;
                return (
                  <div key={schema.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-4 rounded-lg bg-muted/30">
                    <div className="md:col-span-2">
                      <Label className="font-medium">{schema.label}</Label>
                      <p className="text-xs text-muted-foreground mt-1">{schema.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={schema.min}
                        max={schema.max}
                        value={val}
                        onChange={e => setLocalValues(prev => ({ ...prev, [schema.key]: Number(e.target.value) }))}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">jours</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boolean settings */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tâches planifiées</h3>
            <div className="space-y-3">
              {SETTINGS_SCHEMA.filter(s => s.type === 'boolean').map(schema => {
                const val = getVal(schema.key, schema) as boolean;
                return (
                  <div key={schema.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <Label className="font-medium cursor-pointer" htmlFor={schema.key}>{schema.label}</Label>
                      <p className="text-xs text-muted-foreground mt-1">{schema.description}</p>
                    </div>
                    <Switch
                      id={schema.key}
                      checked={val}
                      onCheckedChange={checked => setLocalValues(prev => ({ ...prev, [schema.key]: checked }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info about cron schedule */}
          <div className="p-3 rounded-lg bg-muted/20 border text-sm">
            <p className="font-medium">📅 Cron nightly-rollup-recompute</p>
            <p className="text-muted-foreground text-xs mt-1">
              Planifié chaque nuit à <strong>2h30 UTC</strong> — recalcule les rollups prix/stock de tous les produits actifs + nettoie les offres fantômes selon les seuils ci-dessus.
            </p>
          </div>

          {/* Settings history */}
          {settings && settings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Historique des modifications</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clé</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Dernière modif.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.map(s => (
                    <TableRow key={s.key}>
                      <TableCell className="font-mono text-xs">{s.key}</TableCell>
                      <TableCell className="font-mono text-xs">{JSON.stringify(s.value)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(s.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SCHEDULE human-readable helper ──────────────────────────────────────────
function describeCronSchedule(schedule: string): string {
  const map: Record<string, string> = {
    "0 * * * *": "Toutes les heures",
    "0 0 * * *": "Chaque nuit à minuit",
    "30 2 * * *": "Chaque nuit à 2h30",
    "0 3 * * *": "Chaque nuit à 3h00",
    "0 5 * * *": "Chaque nuit à 5h00",
    "* * * * *": "Chaque minute",
  };
  return map[schedule] || schedule;
}

function extractJobFunction(command: string): string {
  const match = command.match(/\/functions\/v1\/([a-z0-9-]+)/);
  if (match) return match[1];
  const rpcMatch = command.match(/public\.([a-z_]+)\(/);
  if (rpcMatch) return rpcMatch[1];
  return command.substring(0, 40) + "…";
}

// ─── CronJobsPanel component ──────────────────────────────────────────────────
type CronJob = {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  username: string;
};

type CronRun = {
  runid: number;
  jobid: number;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
  duration_ms: number | null;
};

function CronJobsPanel() {
  const queryClient = useQueryClient();
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["cron-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cron_jobs");
      if (error) throw error;
      return data as CronJob[];
    },
    refetchInterval: 30_000,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["cron-history", expandedJob],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cron_job_history", {
        p_jobid: expandedJob ?? null,
        p_limit: 50,
      });
      if (error) throw error;
      return data as CronRun[];
    },
    refetchInterval: expandedJob ? 10_000 : 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ jobid, active }: { jobid: number; active: boolean }) => {
      const { data, error } = await supabase.rpc("toggle_cron_job", { p_jobid: jobid, p_active: active });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { active }) => {
      toast.success(`Job ${active ? "activé" : "désactivé"} avec succès`);
      queryClient.invalidateQueries({ queryKey: ["cron-jobs"] });
    },
    onError: (err: any) => toast.error("Erreur", { description: err.message }),
  });

  const getRunStatusBadge = (status: string) => {
    if (status === "succeeded")
      return <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle className="h-3 w-3" />Succès</Badge>;
    if (status === "failed")
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Échec</Badge>;
    if (status === "running")
      return <Badge className="bg-accent text-accent-foreground gap-1"><RefreshCw className="h-3 w-3 animate-spin" />En cours</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (jobsLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Chargement des tâches planifiées...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Calendar className="h-7 w-7 text-primary" />
              <div>
                <p className="text-xl font-bold">{jobs?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Jobs configurés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Power className="h-7 w-7 text-primary" />
              <div>
                <p className="text-xl font-bold">{jobs?.filter(j => j.active).length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Timer className="h-7 w-7 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{history?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Exécutions récentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Tâches planifiées pg_cron
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["cron-jobs"] })}>
              <RefreshCw className="h-4 w-4 mr-2" />Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {jobs?.map((job) => {
              const isExpanded = expandedJob === job.jobid;
              const jobHistory = (history ?? []).filter(r => r.jobid === job.jobid);
              const lastRun = jobHistory[0];
              const successCount = jobHistory.filter(r => r.status === "succeeded").length;
              const failCount = jobHistory.filter(r => r.status === "failed").length;

              return (
                <div key={job.jobid}>
                  <div className={`p-4 transition-colors ${!job.active ? "opacity-60 bg-muted/20" : ""}`}>
                    <div className="flex items-start gap-4 flex-wrap">
                      {/* Toggle */}
                      <div className="flex items-center pt-0.5">
                        <Switch
                          checked={job.active}
                          onCheckedChange={(active) => toggleMutation.mutate({ jobid: job.jobid, active })}
                          disabled={toggleMutation.isPending}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{job.jobname}</span>
                          {job.active
                            ? <Badge className="bg-primary/10 text-primary text-xs">Actif</Badge>
                            : <Badge variant="secondary" className="text-xs">Pausé</Badge>
                          }
                          {lastRun && getRunStatusBadge(lastRun.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {describeCronSchedule(job.schedule)}
                            <code className="bg-muted px-1 rounded ml-1">{job.schedule}</code>
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {extractJobFunction(job.command)}
                          </span>
                        </div>
                        {lastRun && (
                          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                            <span>Dernière exéc : {format(new Date(lastRun.start_time), "dd/MM/yyyy HH:mm:ss", { locale: fr })}</span>
                            {lastRun.duration_ms != null && <span>{lastRun.duration_ms}ms</span>}
                            {jobHistory.length > 0 && (
                              <span className="text-primary">{successCount}/{jobHistory.length} succès</span>
                            )}
                            {failCount > 0 && <span className="text-destructive">{failCount} échec{failCount > 1 ? "s" : ""}</span>}
                          </div>
                        )}
                      </div>

                      {/* Expand button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedJob(isExpanded ? null : job.jobid)}
                        className="shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Historique
                      </Button>
                    </div>
                  </div>

                  {/* Expanded history */}
                  {isExpanded && (
                    <div className="bg-muted/30 border-t px-4 pb-4">
                      <div className="pt-3 mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium">Historique — <span className="font-mono text-primary">{job.jobname}</span></h4>
                        {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      {jobHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Aucune exécution enregistrée</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Run</TableHead>
                              <TableHead>Démarrage</TableHead>
                              <TableHead>Durée</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Message</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobHistory.map((run) => (
                              <TableRow key={run.runid}>
                                <TableCell className="font-mono text-xs text-muted-foreground">#{run.runid}</TableCell>
                                <TableCell className="text-xs">{format(new Date(run.start_time), "dd/MM HH:mm:ss", { locale: fr })}</TableCell>
                                <TableCell className="text-xs">{run.duration_ms != null ? `${run.duration_ms}ms` : "—"}</TableCell>
                                <TableCell>{getRunStatusBadge(run.status)}</TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">{run.return_message || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {(!jobs || jobs.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">Aucun job cron configuré</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Global recent history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Dernières exécutions (tous jobs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />Chargement...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Démarrage</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history ?? []).slice(0, 30).map((run) => {
                  const job = jobs?.find(j => j.jobid === run.jobid);
                  return (
                    <TableRow key={run.runid}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{run.runid}</TableCell>
                      <TableCell className="font-medium text-sm">{job?.jobname ?? `Job #${run.jobid}`}</TableCell>
                      <TableCell className="text-xs">{format(new Date(run.start_time), "dd/MM HH:mm:ss", { locale: fr })}</TableCell>
                      <TableCell className="text-xs">{run.duration_ms != null ? `${run.duration_ms}ms` : "—"}</TableCell>
                      <TableCell>{getRunStatusBadge(run.status)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">{run.return_message || "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {(history ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune exécution enregistrée</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
