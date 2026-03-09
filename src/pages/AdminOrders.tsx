import { useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { OrdersDataTable } from "@/components/order/OrdersDataTable";
import { OrderDetailModalV2 } from "@/components/order/OrderDetailModalV2";
import {
  Search, Package, TrendingUp, Euro, Clock,
  Upload, Download, Loader2, FileSpreadsheet, CalendarIcon, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportOrdersXLSX } from "@/components/order/generateOrderPDF";
import {
  useOrdersPaginated, useOrderStats, useUpdateOrderStatus,
  type Order, type OrderFilters, type OrderStatus,
  DEFAULT_FILTERS, STATUS_LABELS,
} from "@/hooks/useOrdersPaginated";

// ── Utilitaires import ────────────────────────────────────────────────────────

function mapImportRow(row: Record<string, string>) {
  const find = (...keys: string[]) => {
    for (const key of keys) {
      const found = Object.entries(row).find(
        ([k]) => k.toLowerCase().includes(key.toLowerCase()),
      );
      if (found && found[1] !== undefined && found[1] !== "") return found[1];
    }
    return undefined;
  };

  const rawStatus = (find("statut", "status", "état", "etat") || "pending").toLowerCase();
  const statusMap: Record<string, OrderStatus> = {
    pending: "pending", "en attente": "pending",
    confirmed: "confirmed", confirmée: "confirmed", confirmee: "confirmed",
    preparing: "preparing", "en préparation": "preparing", "en preparation": "preparing",
    shipped: "shipped", expédiée: "shipped", expediee: "shipped",
    delivered: "delivered", livrée: "delivered", livree: "delivered",
    cancelled: "cancelled", annulée: "cancelled", annulee: "cancelled",
  };

  return {
    order_number: find("commande", "order", "num", "n°", "numero", "numéro")
      || `IMP-${Date.now().toString(36).slice(-5).toUpperCase()}`,
    customer_email: find("email", "mail", "courriel") || "import@ma-papeterie.fr",
    customer_phone: find("tel", "phone", "portable", "mobile") || null,
    status: (statusMap[rawStatus] ?? "pending") as OrderStatus,
    total_amount: parseFloat(
      String(find("montant", "total", "amount", "ttc") || "0").replace(",", "."),
    ) || 0,
    notes: find("note", "commentaire", "observation", "remarque") || null,
  };
}

// ── Date presets ──────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: "Aujourd'hui", days: 0 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
] as const;

function getDateFrom(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const { toast } = useToast();

  // Filters
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const updateFilters = useCallback(
    (patch: Partial<OrderFilters>) =>
      setFilters((prev) => ({ ...prev, ...patch, ...(patch.page === undefined && !("page" in patch) ? { page: 0 } : {}) })),
    [],
  );

  // Data
  const { data, isLoading } = useOrdersPaginated(filters);
  const { data: stats } = useOrderStats();
  const updateStatus = useUpdateOrderStatus();

  // Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof mapImportRow>[]>([]);
  const [importing, setImporting] = useState(false);

  // Active status filters
  const toggleStatus = (s: OrderStatus) => {
    const current = filters.statuses;
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    updateFilters({ statuses: next, page: 0 });
  };

  // Handlers
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateStatus.mutate({ orderId, status });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { read, utils } = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      setImportPreview(rawRows.slice(0, 200).map(mapImportRow));
    } catch {
      toast({ title: "Erreur lecture fichier", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!importPreview.length) return;
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = importPreview.map((r) => ({ ...r, user_id: user?.id }));
      const { error: dbError } = await supabase.from("orders").insert(rows);
      if (dbError) throw dbError;
      toast({ title: "Import réussi", description: `${rows.length} commande(s) importée(s)` });
      setIsImportOpen(false);
      setImportPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      toast({
        title: "Erreur import",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout title="Gestion des Commandes" description="Suivre et gérer les commandes clients">
      <div className="space-y-6">

        {/* ── Stats Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total commandes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total ?? "—"}</div>
              <p className="text-xs text-muted-foreground">{stats?.orders30d ?? 0} sur 30j</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats?.pending ?? 0}</div>
              <p className="text-xs text-muted-foreground">A traiter</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CA total</CardTitle>
              <Euro className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats ? `${stats.revenue.toFixed(0)} €` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats ? `${stats.revenue30d.toFixed(0)} € sur 30j` : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats ? `${stats.avgOrder.toFixed(2)} €` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro ou email…"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Date presets */}
            <div className="flex items-center gap-1">
              {DATE_PRESETS.map((p) => {
                const from = getDateFrom(p.days);
                const isActive = filters.dateFrom === from;
                return (
                  <Button
                    key={p.days}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      isActive
                        ? updateFilters({ dateFrom: null, dateTo: null })
                        : updateFilters({ dateFrom: from, dateTo: null })
                    }
                  >
                    {p.label}
                  </Button>
                );
              })}
              {/* Custom date range */}
              <div className="flex items-center gap-1 ml-1">
                <Input
                  type="date"
                  className="h-8 w-[130px] text-xs"
                  value={filters.dateFrom || ""}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value || null })}
                />
                <span className="text-xs text-muted-foreground">→</span>
                <Input
                  type="date"
                  className="h-8 w-[130px] text-xs"
                  value={filters.dateTo || ""}
                  onChange={(e) => updateFilters({ dateTo: e.target.value || null })}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => data?.orders && exportOrdersXLSX(data.orders as any)}
                disabled={!data?.orders?.length}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => { setImportPreview([]); setIsImportOpen(true); }}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Statut :</span>
            {(Object.entries(STATUS_LABELS) as [OrderStatus, string][]).map(([key, label]) => (
              <Badge
                key={key}
                variant={filters.statuses.includes(key) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleStatus(key)}
              >
                {label}
              </Badge>
            ))}
            {(filters.statuses.length > 0 || filters.dateFrom || filters.search) && (
              <Button
                variant="ghost" size="sm" className="h-6 text-xs"
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                <X className="h-3 w-3 mr-1" />
                Tout effacer
              </Button>
            )}
          </div>
        </div>

        {/* ── Data Table ───────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <OrdersDataTable
            orders={data?.orders ?? []}
            totalCount={data?.totalCount ?? 0}
            totalPages={data?.totalPages ?? 0}
            filters={filters}
            onFiltersChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onViewDetails={handleViewDetails}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* ── Order Detail ─────────────────────────────────────────────── */}
        <OrderDetailModalV2
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />

        {/* ── Import Dialog ────────────────────────────────────────────── */}
        <Dialog open={isImportOpen} onOpenChange={(v) => { if (!importing) setIsImportOpen(v); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Importer des commandes (CSV / XLS / XLSX)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="import-file" className="mb-2 block text-sm font-medium">
                  Fichier à importer
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Colonnes reconnues : <span className="font-mono">N° Commande</span>,{" "}
                  <span className="font-mono">Email</span>,{" "}
                  <span className="font-mono">Téléphone</span>,{" "}
                  <span className="font-mono">Statut</span>,{" "}
                  <span className="font-mono">Montant</span>,{" "}
                  <span className="font-mono">Notes</span>
                </p>
                <input
                  id="import-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
              </div>

              {importPreview.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Aperçu — {importPreview.length} ligne(s) détectée(s)
                  </p>
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">N° Commande</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Téléphone</th>
                          <th className="px-3 py-2 text-left">Statut</th>
                          <th className="px-3 py-2 text-right">Montant TTC</th>
                          <th className="px-3 py-2 text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 10).map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                            <td className="px-3 py-1.5 font-mono">{row.order_number}</td>
                            <td className="px-3 py-1.5">{row.customer_email}</td>
                            <td className="px-3 py-1.5">{row.customer_phone || "—"}</td>
                            <td className="px-3 py-1.5">{row.status}</td>
                            <td className="px-3 py-1.5 text-right">{row.total_amount.toFixed(2)} €</td>
                            <td className="px-3 py-1.5 truncate max-w-[120px]">{row.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 10 && (
                      <p className="text-xs text-muted-foreground px-3 py-2">
                        … et {importPreview.length - 10} ligne(s) supplémentaire(s)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={importing}>
                Annuler
              </Button>
              <Button onClick={handleImport} disabled={importPreview.length === 0 || importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Import en cours…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Importer {importPreview.length} commande(s)</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
