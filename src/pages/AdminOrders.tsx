import { useState, useRef, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useOrders, Order } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { OrderCard } from "@/components/order/OrderCard";
import { OrderDetailModal } from "@/components/order/OrderDetailModal";
import {
  Search, Filter, Package, TrendingUp, Euro, Users,
  Upload, Download, Loader2, FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportOrdersXLSX } from "@/components/order/generateOrderPDF";

// ── Utilitaires import ────────────────────────────────────────────────────────

function mapImportRow(row: Record<string, string>) {
  const find = (...keys: string[]) => {
    for (const key of keys) {
      const found = Object.entries(row).find(
        ([k]) => k.toLowerCase().includes(key.toLowerCase()),
      );
      if (found && found[1] !== undefined && found[1] !== '') return found[1];
    }
    return undefined;
  };

  const rawStatus = (find('statut', 'status', 'état', 'etat') || 'pending').toLowerCase();
  const statusMap: Record<string, Order['status']> = {
    pending: 'pending', 'en attente': 'pending',
    confirmed: 'confirmed', confirmée: 'confirmed', confirmee: 'confirmed',
    preparing: 'preparing', 'en préparation': 'preparing', 'en preparation': 'preparing',
    shipped: 'shipped', expédiée: 'shipped', expediee: 'shipped',
    delivered: 'delivered', livrée: 'delivered', livree: 'delivered',
    cancelled: 'cancelled', annulée: 'cancelled', annulee: 'cancelled',
  };

  return {
    order_number: find('commande', 'order', 'num', 'n°', 'numero', 'numéro')
      || `IMP-${Date.now().toString(36).slice(-5).toUpperCase()}`,
    customer_email: find('email', 'mail', 'courriel') || 'import@ma-papeterie.fr',
    customer_phone: find('tel', 'phone', 'portable', 'mobile') || null,
    status: (statusMap[rawStatus] ?? 'pending') as Order['status'],
    total_amount: parseFloat(
      String(find('montant', 'total', 'amount', 'ttc') || '0').replace(',', '.')
    ) || 0,
    notes: find('note', 'commentaire', 'observation', 'remarque') || null,
  };
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const { toast } = useToast();
  const { orders, loading, error, updateOrderStatus, refetch } = useOrders(true);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof mapImportRow>[]>([]);
  const [importing, setImporting] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    const result = await updateOrderStatus(orderId, status);
    if (result.success) {
      toast({ title: "Statut mis à jour" });
    } else {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
      setImportPreview(rawRows.slice(0, 200).map(mapImportRow));
    } catch {
      toast({ title: 'Erreur lecture fichier', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!importPreview.length) return;
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = importPreview.map(r => ({ ...r, user_id: user?.id }));
      const { error: dbError } = await supabase.from('orders').insert(rows);
      if (dbError) throw dbError;
      toast({
        title: 'Import réussi',
        description: `${rows.length} commande(s) importée(s)`,
      });
      setIsImportOpen(false);
      setImportPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
    } catch (e) {
      toast({
        title: 'Erreur import',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  // ── Filtered data ────────────────────────────────────────────────────────────

  const filteredOrders = useMemo(() =>
    orders.filter(order => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [orders, searchTerm, statusFilter],
  );

  const stats = useMemo(() => ({
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'pending').length,
    revenue:  orders.reduce((sum, o) => sum + o.total_amount, 0),
    avgOrder: orders.length > 0
      ? orders.reduce((sum, o) => sum + o.total_amount, 0) / orders.length
      : 0,
  }), [orders]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout title="Gestion des Commandes" description="Suivre et gérer les commandes clients">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Gestion des Commandes" description="Suivre et gérer les commandes clients">
        <div className="text-center text-destructive">{error}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestion des Commandes" description="Suivre et gérer les commandes clients">
      <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.revenue.toFixed(2)} €
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Panier Moyen</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgOrder.toFixed(2)} €</div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher par numéro ou email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="confirmed">Confirmée</SelectItem>
              <SelectItem value="preparing">En préparation</SelectItem>
              <SelectItem value="shipped">Expédiée</SelectItem>
              <SelectItem value="delivered">Livrée</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => exportOrdersXLSX(filteredOrders)}
            disabled={filteredOrders.length === 0}
            title="Exporter en XLSX"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter ({filteredOrders.length})
          </Button>

          <Button
            variant="outline"
            onClick={() => { setImportPreview([]); setIsImportOpen(true); }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer CSV/XLS
          </Button>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune commande trouvée</h3>
              <p className="text-muted-foreground text-center">
                {orders.length === 0
                  ? "Aucune commande n'a encore été passée."
                  : "Aucune commande ne correspond aux critères de recherche."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetails={handleViewDetails}
                isAdmin={true}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />

        {/* ── Import Dialog ──────────────────────────────────────────────── */}
        <Dialog open={isImportOpen} onOpenChange={v => { if (!importing) setIsImportOpen(v); }}>
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
                  Colonnes reconnues : <span className="font-mono">N° Commande</span>,{' '}
                  <span className="font-mono">Email</span>,{' '}
                  <span className="font-mono">Téléphone</span>,{' '}
                  <span className="font-mono">Statut</span>,{' '}
                  <span className="font-mono">Montant</span>,{' '}
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
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                            <td className="px-3 py-1.5 font-mono">{row.order_number}</td>
                            <td className="px-3 py-1.5">{row.customer_email}</td>
                            <td className="px-3 py-1.5">{row.customer_phone || '—'}</td>
                            <td className="px-3 py-1.5">{row.status}</td>
                            <td className="px-3 py-1.5 text-right">{row.total_amount.toFixed(2)} €</td>
                            <td className="px-3 py-1.5 truncate max-w-[120px]">{row.notes || '—'}</td>
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
              <Button
                onClick={handleImport}
                disabled={importPreview.length === 0 || importing}
              >
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
