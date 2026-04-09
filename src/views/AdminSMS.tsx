import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare, Send, Activity, FileText, Settings, Loader2,
  CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw,
} from "lucide-react";
import {
  useSmsLogs, useSmsStats, useSmsCampaigns, useCreateSmsCampaign,
  useSendSmsCampaign, useSmsGatewayHealth, useSmsTemplates, useUpdateSmsTemplate,
} from "@/hooks/useAdminSms";

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof CheckCircle }> = {
  pending: { variant: "outline", icon: Clock },
  sent: { variant: "secondary", icon: Send },
  delivered: { variant: "default", icon: CheckCircle },
  failed: { variant: "destructive", icon: XCircle },
  rejected: { variant: "destructive", icon: AlertTriangle },
};

const SMS_TYPE_LABELS: Record<string, string> = {
  order_status: "Commande",
  shipping_alert: "Expédition",
  service_order: "Service",
  wishlist_alert: "Favoris",
  promotional: "Promo",
  test: "Test",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab() {
  const { data: health, isLoading: healthLoading, refetch } = useSmsGatewayHealth();
  const { data: stats, isLoading: statsLoading } = useSmsStats();

  return (
    <div className="space-y-6">
      {/* Gateway Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">État de la Gateway</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : !health?.configured ? (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Gateway non configurée. Ajoutez les credentials dans admin_secrets.</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className={`h-3 w-3 rounded-full ${health.gateway_reachable ? "bg-green-500" : "bg-red-500"}`} />
              <span className="font-medium">
                {health.gateway_reachable ? "Connectée" : "Injoignable"}
              </span>
              <span className="text-sm text-muted-foreground">
                Mode : {health.mode} — {health.gateway_url}
              </span>
              {health.gateway_error && (
                <span className="text-sm text-destructive">{health.gateway_error}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Aujourd'hui", data: stats?.today },
          { label: "Cette semaine", data: stats?.week },
          { label: "Ce mois", data: stats?.month },
        ].map(({ label, data }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{data?.total || 0}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-600">{data?.delivered || 0} livrés</span>
                    <span className="text-blue-600">{data?.sent || 0} envoyés</span>
                    <span className="text-red-600">{data?.failed || 0} échoués</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rate Limits */}
      {health?.limits && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Limites configurées</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6 text-sm">
            <span>Max/tél/jour : <strong>{health.limits.daily_per_phone}</strong></span>
            <span>Max/heure global : <strong>{health.limits.hourly_global}</strong></span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Campaigns Tab ───────────────────────────────────────────────────────────

function CampaignsTab() {
  const { data: campaigns, isLoading } = useSmsCampaigns();
  const createCampaign = useCreateSmsCampaign();
  const sendCampaign = useSendSmsCampaign();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState("all_opted_in");
  const [customPhones, setCustomPhones] = useState("");

  const handleCreate = () => {
    if (!name || !message) return;
    createCampaign.mutate(
      {
        name,
        message_text: message,
        target_segment: segment,
        custom_phone_numbers: segment === "custom"
          ? customPhones.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean)
          : undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setName("");
          setMessage("");
        },
      },
    );
  };

  const SEGMENT_LABELS: Record<string, string> = {
    all_opted_in: "Tous les inscrits",
    vip: "Clients VIP",
    regular: "Clients réguliers",
    occasional: "Clients occasionnels",
    custom: "Numéros personnalisés",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Campagnes SMS</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Send className="h-4 w-4 mr-2" /> Nouvelle campagne
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Nom de la campagne</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rentrée 2026" />
            </div>
            <div className="space-y-2">
              <Label>Message ({message.length}/160 caractères)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ma Papeterie: ..."
                maxLength={160}
                rows={3}
              />
              {message.length > 160 && (
                <p className="text-xs text-amber-600">Le message dépasse 160 caractères (multi-SMS)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Segment cible</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEGMENT_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {segment === "custom" && (
              <div className="space-y-2">
                <Label>Numéros (un par ligne)</Label>
                <Textarea
                  value={customPhones}
                  onChange={(e) => setCustomPhones(e.target.value)}
                  placeholder="06 12 34 56 78&#10;07 98 76 54 32"
                  rows={4}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createCampaign.isPending || !name || !message}>
                {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Destinataires</TableHead>
              <TableHead>Envoyés</TableHead>
              <TableHead>Livrés</TableHead>
              <TableHead>Échoués</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(campaigns || []).map((c: Record<string, unknown>) => (
              <TableRow key={c.id as string}>
                <TableCell className="font-medium">{c.name as string}</TableCell>
                <TableCell>{SEGMENT_LABELS[c.target_segment as string] || c.target_segment as string}</TableCell>
                <TableCell><StatusBadge status={c.status as string} /></TableCell>
                <TableCell>{c.total_recipients as number}</TableCell>
                <TableCell>{c.sent_count as number}</TableCell>
                <TableCell>{c.delivered_count as number}</TableCell>
                <TableCell>{c.failed_count as number}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(c.created_at as string).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell>
                  {c.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => sendCampaign.mutate(c.id as string)}
                      disabled={sendCampaign.isPending}
                    >
                      {sendCampaign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Aucune campagne SMS
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ── Logs Tab ────────────────────────────────────────────────────────────────

function LogsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 25;

  const { data, isLoading } = useSmsLogs({
    search: search || undefined,
    status: statusFilter || undefined,
    sms_type: typeFilter || undefined,
    offset: page * limit,
    limit,
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher par téléphone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="max-w-[250px]"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="delivered">Livré</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(SMS_TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Erreur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.logs || []).map((log: Record<string, unknown>) => (
                <TableRow key={log.id as string}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(log.created_at as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.recipient_phone as string}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{SMS_TYPE_LABELS[log.sms_type as string] || log.sms_type as string}</Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={log.status as string} /></TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm">{log.message_text as string}</TableCell>
                  <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                    {log.error_message as string || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.logs || data.logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun log SMS
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{data?.total || 0} résultats</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Précédent
                </Button>
                <span className="text-sm py-1">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Config Tab ──────────────────────────────────────────────────────────────

function ConfigTab() {
  const { data: templates, isLoading } = useSmsTemplates();
  const updateTemplate = useUpdateSmsTemplate();
  const [editId, setEditId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const handleEdit = (id: string, body: string) => {
    setEditId(id);
    setEditBody(body);
  };

  const handleSave = () => {
    if (!editId) return;
    updateTemplate.mutate(
      { id: editId, body_template: editBody },
      { onSuccess: () => setEditId(null) },
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Templates SMS</CardTitle>
          <CardDescription>
            Personnalisez les messages envoyés à vos clients. Variables disponibles entre {"{{"}accolades{"}}"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="space-y-4">
              {(templates || []).map((t: Record<string, unknown>) => (
                <div key={t.id as string} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{t.label as string}</h4>
                      <Badge variant="outline" className="font-mono text-xs">{t.slug as string}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={t.is_active as boolean}
                        onCheckedChange={(v) => updateTemplate.mutate({ id: t.id as string, is_active: v })}
                      />
                      {editId !== t.id && (
                        <Button variant="outline" size="sm" onClick={() => handleEdit(t.id as string, t.body_template as string)}>
                          Modifier
                        </Button>
                      )}
                    </div>
                  </div>

                  {editId === t.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={2}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Variables : {(t.variables as string[]).map((v) => `{{${v}}}`).join(", ")}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={updateTemplate.isPending}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-mono">{t.body_template as string}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Gateway</CardTitle>
          <CardDescription>
            Les credentials sont stockés dans admin_secrets (dashboard Supabase).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>SMS_GATEWAY_URL</strong> — URL de la gateway (mode cloud ou local)</p>
          <p><strong>SMS_GATEWAY_USERNAME</strong> / <strong>SMS_GATEWAY_PASSWORD</strong> — Credentials HTTP Basic</p>
          <p><strong>SMS_GATEWAY_MODE</strong> — <code>cloud</code> ou <code>local</code></p>
          <p><strong>SMS_WEBHOOK_SECRET</strong> — Secret pour authentifier les webhooks de statut</p>
          <p><strong>SMS_DAILY_LIMIT_PER_PHONE</strong> — Max SMS/jour par numéro (défaut: 3)</p>
          <p><strong>SMS_HOURLY_GLOBAL_LIMIT</strong> — Max SMS/heure global (défaut: 30)</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AdminSMS() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Notifications SMS
          </h1>
          <p className="text-muted-foreground">
            Gérez les notifications SMS via Android SMS Gateway
          </p>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-1">
              <Activity className="h-4 w-4" /> Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1">
              <Send className="h-4 w-4" /> Campagnes
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1">
              <FileText className="h-4 w-4" /> Logs
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1">
              <Settings className="h-4 w-4" /> Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
          <TabsContent value="logs"><LogsTab /></TabsContent>
          <TabsContent value="config"><ConfigTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
