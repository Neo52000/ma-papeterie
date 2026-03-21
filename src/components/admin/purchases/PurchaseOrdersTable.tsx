import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Package, TrendingUp, Pencil, Trash2, Search, FileUp,
  FileText, ShoppingCart, Clock, Filter,
} from 'lucide-react';
import type { PurchaseOrder, Supplier } from './types';
import { STATUS_MAP, STATUS_OPTIONS } from './types';

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

interface PurchaseOrdersTableProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  onCreateClick: () => void;
  onEditClick: (order: PurchaseOrder) => void;
  onDeleteClick: (order: PurchaseOrder) => void;
  onReceiveClick: (order: PurchaseOrder) => void;
  onPdfImportClick: () => void;
  onXlsImportClick: () => void;
}

export function PurchaseOrdersTable({
  purchaseOrders,
  suppliers,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onReceiveClick,
  onPdfImportClick,
  onXlsImportClick,
}: PurchaseOrdersTableProps) {
  // ─── KPI stats ──────────────────────────────────────────────────────────────
  const kpiStats = {
    total: purchaseOrders.length,
    drafts: purchaseOrders.filter(o => o.status === 'draft').length,
    pending: purchaseOrders.filter(o => ['sent', 'confirmed'].includes(o.status || '')).length,
    totalHT: purchaseOrders.reduce((s, o) => s + (o.total_ht || 0), 0),
  };

  // ─── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = purchaseOrders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      o.order_number?.toLowerCase().includes(q) ||
      (o.suppliers?.name ?? '').toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-7 w-7 text-primary shrink-0" />
              <div>
                <p className="text-2xl font-bold">{kpiStats.total}</p>
                <p className="text-xs text-muted-foreground">Bons de commande</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold">{kpiStats.drafts}</p>
                <p className="text-xs text-muted-foreground">Brouillons</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-7 w-7 text-secondary shrink-0" />
              <div>
                <p className="text-2xl font-bold">{kpiStats.pending}</p>
                <p className="text-xs text-muted-foreground">En attente livraison</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-accent shrink-0" />
              <div>
                <p className="text-2xl font-bold">{kpiStats.totalHT.toFixed(0)} €</p>
                <p className="text-xs text-muted-foreground">Total HT</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter + actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher par numéro ou fournisseur…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onXlsImportClick}>
          <FileUp className="mr-2 h-4 w-4" />
          Importer CSV/XLS
        </Button>
        <Button variant="outline" onClick={onPdfImportClick}>
          <FileUp className="mr-2 h-4 w-4" />
          Importer un PDF
        </Button>
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau BdC
        </Button>
      </div>

      {/* Results count when filtering */}
      {(searchQuery || filterStatus !== 'all') && (
        <p className="text-sm text-muted-foreground">
          {filteredOrders.length} résultat(s) sur {purchaseOrders.length}
          {(searchQuery || filterStatus !== 'all') && (
            <button
              className="ml-2 underline hover:text-foreground"
              onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
            >
              Effacer les filtres
            </button>
          )}
        </p>
      )}

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{purchaseOrders.length === 0 ? 'Aucun bon de commande' : 'Aucun résultat pour ces filtres'}</p>
          </CardContent>
        </Card>
      ) : (
        filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    {order.order_number}
                    <StatusBadge status={order.status || 'draft'} />
                  </CardTitle>
                  <CardDescription>
                    {order.suppliers?.name || <span className="italic text-destructive">Fournisseur non défini</span>}
                    {order.created_at && (
                      <span className="ml-2 text-muted-foreground">
                        · {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {['sent', 'confirmed', 'partially_received'].includes(order.status) && (
                    <Button size="sm" onClick={() => onReceiveClick(order)}>
                      <Package className="h-3.5 w-3.5 mr-1" />
                      Réceptionner
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onEditClick(order)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onDeleteClick(order)}
                    title="Supprimer ce bon de commande"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total HT</p>
                  <p className="font-semibold">{(order.total_ht || 0).toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total TTC</p>
                  <p className="font-semibold">{(order.total_ttc || 0).toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Livraison prévue</p>
                  <p className="font-semibold">
                    {order.expected_delivery_date
                      ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')
                      : 'Non définie'}
                  </p>
                </div>
              </div>
              {order.notes && (
                <p className="mt-3 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  {order.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
