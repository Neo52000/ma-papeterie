import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, BarChart3, Target, Sparkles, Loader2,
  Search, Crown, Star, UserCheck, UserX, Mail, Eye,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronsUpDown, ChevronUp, ChevronDown, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCustomerList,
  type CustomerFilters,
  DEFAULT_CUSTOMER_FILTERS,
} from "@/hooks/useCustomers";
import { CustomerDetailModal } from "@/components/crm/CustomerDetailModal";
import { RevenueChart } from "@/components/crm/RevenueChart";
import { CustomerSegmentation } from "@/components/crm/CustomerSegmentation";

// ── Segment config ───────────────────────────────────────────────────────────

const SEGMENT_CONFIG = {
  vip: { label: "VIP", icon: Crown, color: "bg-yellow-100 text-yellow-800 border-yellow-200", iconColor: "text-yellow-500" },
  regular: { label: "Régulier", icon: Star, color: "bg-blue-100 text-blue-800 border-blue-200", iconColor: "text-blue-500" },
  occasional: { label: "Occasionnel", icon: UserCheck, color: "bg-green-100 text-green-800 border-green-200", iconColor: "text-green-500" },
  inactive: { label: "Inactif", icon: UserX, color: "bg-gray-100 text-gray-600 border-gray-200", iconColor: "text-gray-400" },
} as const;

// ── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ column, current, dir }: { column: string; current: string; dir: string }) {
  if (column !== current) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3 ml-1" />
    : <ChevronDown className="h-3 w-3 ml-1" />;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminCRM() {
  const { user, isAdmin, isSuperAdmin } = useAuth();

  // Customer list state
  const [cFilters, setCFilters] = useState<CustomerFilters>(DEFAULT_CUSTOMER_FILTERS);
  const updateCFilters = useCallback(
    (patch: Partial<CustomerFilters>) =>
      setCFilters((prev) => ({
        ...prev,
        ...patch,
        ...(patch.page === undefined && !("page" in patch) ? { page: 0 } : {}),
      })),
    [],
  );
  const { data: customerData, isLoading: customersLoading } = useCustomerList(cFilters);

  // Customer detail modal
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // RFM
  const [isCalculatingRFM, setIsCalculatingRFM] = useState(false);
  const [rfmScores, setRfmScores] = useState<any[]>([]);

  const fetchRFMScores = async () => {
    const { data, error } = await supabase
      .from("customer_rfm_scores")
      .select("*")
      .order("total_spent", { ascending: false })
      .limit(20);
    if (!error && data) setRfmScores(data);
  };

  const handleCalculateRFM = async () => {
    setIsCalculatingRFM(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-rfm-scores");
      if (error) throw error;
      toast.success(`Scores RFM calculés pour ${data.processed} clients`);
      fetchRFMScores();
    } catch {
      toast.error("Erreur lors du calcul des scores RFM");
    } finally {
      setIsCalculatingRFM(false);
    }
  };

  // Sort toggle
  const toggleSort = (col: CustomerFilters["sortBy"]) => {
    if (cFilters.sortBy === col) {
      updateCFilters({ sortDir: cFilters.sortDir === "asc" ? "desc" : "asc", page: cFilters.page });
    } else {
      updateCFilters({ sortBy: col, sortDir: "desc", page: cFilters.page });
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const openCustomer = (email: string) => {
    setSelectedEmail(email);
    setIsDetailOpen(true);
  };

  const handleCopyEmails = () => {
    if (!customerData?.customers) return;
    const emails = customerData.customers.map((c) => c.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success(`${customerData.customers.length} emails copiés`);
  };

  return (
    <AdminLayout title="CRM - Gestion Client" description="Analytics, segmentation et suivi des clients">
      <Tabs defaultValue="clients" className="space-y-6" onValueChange={(v) => v === "rfm" && fetchRFMScores()}>
        <TabsList>
          <TabsTrigger value="clients">
            <Users className="h-4 w-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="segmentation">
            <Target className="h-4 w-4 mr-2" />
            Segmentation
          </TabsTrigger>
          <TabsTrigger value="rfm">
            <Sparkles className="h-4 w-4 mr-2" />
            Scores RFM
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ TAB: CLIENTS ═══════════════════════════════════ */}
        <TabsContent value="clients" className="space-y-4">
          {/* Segment summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: "all", label: "Tous", icon: Users, color: "text-foreground" },
              ...Object.entries(SEGMENT_CONFIG).map(([key, cfg]) => ({
                key,
                label: cfg.label,
                icon: cfg.icon,
                color: cfg.iconColor,
              })),
            ].map((s) => (
              <Card
                key={s.key}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${cFilters.segment === s.key ? "ring-2 ring-primary" : ""}`}
                onClick={() => updateCFilters({ segment: s.key, page: 0 })}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <div>
                    <p className="text-lg font-bold">
                      {customerData?.segmentCounts?.[s.key as keyof typeof customerData.segmentCounts] ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search + Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher par email ou téléphone…"
                value={cFilters.search}
                onChange={(e) => updateCFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyEmails}>
              <Mail className="h-4 w-4 mr-1" />
              Copier emails ({customerData?.totalCount ?? 0})
            </Button>
          </div>

          {/* Customer Table */}
          {customersLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort("email")}
                      >
                        <span className="flex items-center">
                          Client
                          <SortIcon column="email" current={cFilters.sortBy} dir={cFilters.sortDir} />
                        </span>
                      </TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => toggleSort("orderCount")}
                      >
                        <span className="flex items-center justify-end">
                          Commandes
                          <SortIcon column="orderCount" current={cFilters.sortBy} dir={cFilters.sortDir} />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => toggleSort("totalSpent")}
                      >
                        <span className="flex items-center justify-end">
                          CA total
                          <SortIcon column="totalSpent" current={cFilters.sortBy} dir={cFilters.sortDir} />
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Panier moy.</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort("lastOrderDate")}
                      >
                        <span className="flex items-center">
                          Dernière cmd
                          <SortIcon column="lastOrderDate" current={cFilters.sortBy} dir={cFilters.sortDir} />
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customerData?.customers ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun client trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerData?.customers.map((c) => {
                        const seg = SEGMENT_CONFIG[c.segment];
                        return (
                          <TableRow
                            key={c.email}
                            className="hover:bg-muted/30 cursor-pointer"
                            onClick={() => openCustomer(c.email)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm truncate max-w-[220px]">{c.email}</p>
                                {c.phone && (
                                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={seg.color}>
                                <seg.icon className="h-3 w-3 mr-1" />
                                {seg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{c.orderCount}</TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              {c.totalSpent.toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                              {c.avgOrder.toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(c.lastOrderDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost" size="sm"
                                onClick={(e) => { e.stopPropagation(); openCustomer(c.email); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{customerData?.totalCount ?? 0} client{(customerData?.totalCount ?? 0) > 1 ? "s" : ""}</span>
                  <span>—</span>
                  <Select
                    value={String(cFilters.pageSize)}
                    onValueChange={(v) => setCFilters((p) => ({ ...p, pageSize: Number(v), page: 0 }))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>par page</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={cFilters.page === 0}
                    onClick={() => setCFilters((p) => ({ ...p, page: 0 }))}
                  ><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={cFilters.page === 0}
                    onClick={() => setCFilters((p) => ({ ...p, page: p.page - 1 }))}
                  ><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="px-3 text-sm">
                    Page {cFilters.page + 1} / {Math.max(customerData?.totalPages ?? 1, 1)}
                  </span>
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    disabled={cFilters.page >= (customerData?.totalPages ?? 1) - 1}
                    onClick={() => setCFilters((p) => ({ ...p, page: p.page + 1 }))}
                  ><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    disabled={cFilters.page >= (customerData?.totalPages ?? 1) - 1}
                    onClick={() => setCFilters((p) => ({ ...p, page: (customerData?.totalPages ?? 1) - 1 }))}
                  ><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ TAB: ANALYTICS ═════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients uniques</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerData?.segmentCounts?.all ?? "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients VIP</CardTitle>
                <Crown className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{customerData?.segmentCounts?.vip ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
                <UserX className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">{customerData?.segmentCounts?.inactive ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux actifs</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {customerData?.segmentCounts?.all
                    ? `${Math.round(
                        ((customerData.segmentCounts.all - (customerData.segmentCounts.inactive ?? 0)) /
                          customerData.segmentCounts.all) *
                          100,
                      )}%`
                    : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          <RevenueChart />
        </TabsContent>

        {/* ═══════════════ TAB: SEGMENTATION ══════════════════════════════ */}
        <TabsContent value="segmentation">
          <CustomerSegmentation />
        </TabsContent>

        {/* ═══════════════ TAB: RFM ═══════════════════════════════════════ */}
        <TabsContent value="rfm" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Scores RFM</h2>
              <p className="text-muted-foreground">Récence, Fréquence, Montant — Top 20</p>
            </div>
            <Button onClick={handleCalculateRFM} disabled={isCalculatingRFM}>
              {isCalculatingRFM ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calcul en cours...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Calculer les scores</>
              )}
            </Button>
          </div>

          {rfmScores.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                Aucun score RFM. Cliquez sur "Calculer les scores" pour générer.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-center">R</TableHead>
                    <TableHead className="text-center">F</TableHead>
                    <TableHead className="text-center">M</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Dépensé</TableHead>
                    <TableHead className="text-right">Panier moy.</TableHead>
                    <TableHead className="text-right">Risque churn</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfmScores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Badge variant="outline">{s.rfm_segment || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">{s.recency_score}</TableCell>
                      <TableCell className="text-center font-mono">{s.frequency_score}</TableCell>
                      <TableCell className="text-center font-mono">{s.monetary_score}</TableCell>
                      <TableCell className="text-right">{s.total_orders}</TableCell>
                      <TableCell className="text-right font-semibold">{s.total_spent?.toFixed(2)} €</TableCell>
                      <TableCell className="text-right">{s.avg_order_value?.toFixed(2)} €</TableCell>
                      <TableCell className="text-right">
                        <span className={s.churn_risk > 50 ? "text-destructive font-semibold" : ""}>
                          {s.churn_risk?.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{s.lifetime_value_estimate?.toFixed(0)} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        email={selectedEmail}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </AdminLayout>
  );
}
