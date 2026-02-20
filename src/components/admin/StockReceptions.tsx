import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, PackageCheck, Eye, CheckCircle2, Clock, FileText, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  suppliers?: { name: string };
  total_ht?: number;
  expected_delivery_date?: string;
}

interface StockReception {
  id: string;
  reception_number?: string;
  purchase_order_id?: string;
  reception_date?: string;
  status: string;
  notes?: string;
  received_by: string;
  created_at?: string;
  purchase_orders?: { order_number: string; suppliers?: { name: string } };
  stock_reception_items?: StockReceptionItem[];
}

interface StockReceptionItem {
  id: string;
  product_id?: string;
  expected_quantity: number;
  received_quantity: number;
  notes?: string;
  products?: { name: string; sku_interne?: string; ean?: string };
}

interface PurchaseOrderItem {
  id: string;
  product_id?: string;
  quantity: number;
  received_quantity?: number;
  unit_price_ht: number;
  products?: { name: string; sku_interne?: string; ean?: string };
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'outline' },
  in_progress: { label: 'En cours', variant: 'secondary' },
  completed: { label: 'Complète', variant: 'default' },
  partial: { label: 'Partielle', variant: 'secondary' },
};

export function StockReceptions() {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<StockReception[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReception, setSelectedReception] = useState<StockReception | null>(null);
  const [expandedReceptions, setExpandedReceptions] = useState<Set<string>>(new Set());
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  // New reception form state
  const [newForm, setNewForm] = useState({
    purchase_order_id: '',
    reception_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [receptionLines, setReceptionLines] = useState<{ po_item_id: string; product_name: string; expected: number; received: number; notes: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [receptionsRes, ordersRes] = await Promise.all([
        supabase
          .from('stock_receptions')
          .select(`
            *,
            purchase_orders (order_number, suppliers(name)),
            stock_reception_items (
              id, product_id, expected_quantity, received_quantity, notes,
              products (name, sku_interne, ean)
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('purchase_orders')
          .select('*, suppliers(name)')
          .in('status', ['sent', 'confirmed', 'partially_received'])
          .order('created_at', { ascending: false }),
      ]);

      if (receptionsRes.error) throw receptionsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      setReceptions((receptionsRes.data || []) as StockReception[]);
      setPurchaseOrders((ordersRes.data || []) as PurchaseOrder[]);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des réceptions');
    } finally {
      setLoading(false);
    }
  };

  const loadPoItems = async (poId: string) => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, products(name, sku_interne, ean)')
      .eq('purchase_order_id', poId);

    if (error) {
      toast.error('Erreur lors du chargement des lignes de commande');
      return;
    }

    const items = (data || []) as PurchaseOrderItem[];
    setPoItems(items);
    setReceptionLines(
      items.map((item) => ({
        po_item_id: item.id,
        product_name: item.products?.name || 'Produit inconnu',
        expected: item.quantity,
        received: item.quantity, // pre-fill with expected
        notes: '',
      }))
    );
  };

  const handlePoChange = async (poId: string) => {
    setNewForm((f) => ({ ...f, purchase_order_id: poId }));
    if (poId) await loadPoItems(poId);
    else {
      setPoItems([]);
      setReceptionLines([]);
    }
  };

  const handleCreateReception = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Generate reception number
      const receptionNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const { data: reception, error: recError } = await supabase
        .from('stock_receptions')
        .insert({
          purchase_order_id: newForm.purchase_order_id || null,
          reception_date: newForm.reception_date ? new Date(newForm.reception_date).toISOString() : new Date().toISOString(),
          notes: newForm.notes || null,
          received_by: user.id,
          status: 'in_progress',
          reception_number: receptionNumber,
        })
        .select()
        .single();

      if (recError) throw recError;

      // Insert reception items
      if (receptionLines.length > 0 && reception) {
        const itemsToInsert = receptionLines.map((line) => {
          const poItem = poItems.find((p) => p.id === line.po_item_id);
          return {
            reception_id: reception.id,
            product_id: poItem?.product_id || null,
            purchase_order_item_id: line.po_item_id,
            expected_quantity: line.expected,
            received_quantity: line.received,
            notes: line.notes || null,
          };
        });

        const { error: itemsError } = await supabase
          .from('stock_reception_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // Update stock quantities in products
        for (const line of receptionLines) {
          const poItem = poItems.find((p) => p.id === line.po_item_id);
          if (poItem?.product_id && line.received > 0) {
            const { data: prod } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', poItem.product_id)
              .single();
            if (prod) {
              await supabase
                .from('products')
                .update({ stock_quantity: (prod.stock_quantity || 0) + line.received })
                .eq('id', poItem.product_id);
            }
          }
        }

        // Update purchase order status
        const allReceived = receptionLines.every((l) => l.received >= l.expected);
        if (newForm.purchase_order_id) {
          await supabase
            .from('purchase_orders')
            .update({ status: allReceived ? 'received' : 'partially_received' })
            .eq('id', newForm.purchase_order_id);
        }
      }

      // Mark reception as completed
      await supabase
        .from('stock_receptions')
        .update({ status: receptionLines.length > 0 ? 'completed' : 'in_progress' })
        .eq('id', reception.id);

      toast.success(`Réception ${receptionNumber} créée avec succès`);
      setShowNewDialog(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewForm({ purchase_order_id: '', reception_date: new Date().toISOString().split('T')[0], notes: '' });
    setReceptionLines([]);
    setPoItems([]);
  };

  const toggleExpand = (id: string) => {
    setExpandedReceptions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalReceived = receptions.reduce(
    (sum, r) => sum + (r.stock_reception_items?.reduce((s, i) => s + i.received_quantity, 0) || 0),
    0
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des réceptions…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{receptions.length}</p>
                <p className="text-sm text-muted-foreground">Réceptions totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{totalReceived.toLocaleString('fr-FR')}</p>
                <p className="text-sm text-muted-foreground">Unités reçues (total)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{receptions.filter((r) => r.status === 'in_progress').length}</p>
                <p className="text-sm text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header action */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Historique des réceptions</h3>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle réception
        </Button>
      </div>

      {/* List */}
      {receptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <PackageCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune réception enregistrée</p>
            <p className="text-sm mt-1">Créez une nouvelle réception pour commencer</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receptions.map((reception) => {
            const isExpanded = expandedReceptions.has(reception.id);
            const items = reception.stock_reception_items || [];
            const totalItems = items.reduce((s, i) => s + i.received_quantity, 0);
            const cfg = STATUS_CONFIG[reception.status] || STATUS_CONFIG['draft'];

            return (
              <Card key={reception.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(reception.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div>
                        <CardTitle className="text-base">
                          {reception.reception_number || `RÉC-${reception.id.slice(0, 8).toUpperCase()}`}
                        </CardTitle>
                        <CardDescription>
                          {reception.purchase_orders?.order_number
                            ? `BdC : ${reception.purchase_orders.order_number} • ${reception.purchase_orders.suppliers?.name || ''}`
                            : 'Sans bon de commande'}
                          {reception.reception_date &&
                            ` • ${format(new Date(reception.reception_date), 'dd MMM yyyy', { locale: fr })}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{totalItems} unités reçues</span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && items.length > 0 && (
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead className="text-right">Attendu</TableHead>
                          <TableHead className="text-right">Reçu</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.products?.name || '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {item.products?.sku_interne || item.products?.ean || '—'}
                            </TableCell>
                            <TableCell className="text-right">{item.expected_quantity}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  item.received_quantity < item.expected_quantity
                                    ? 'text-destructive font-semibold'
                                    : 'text-green-600 font-semibold'
                                }
                              >
                                {item.received_quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.notes || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {reception.notes && (
                      <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted rounded-md">
                        <strong>Note :</strong> {reception.notes}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* New Reception Dialog */}
      <Dialog open={showNewDialog} onOpenChange={(o) => { setShowNewDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Nouvelle réception de stock
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Bon de commande */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bon de commande (optionnel)</Label>
                <Select value={newForm.purchase_order_id} onValueChange={handlePoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un BdC…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sans bon de commande</SelectItem>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.order_number} — {po.suppliers?.name || 'Fournisseur inconnu'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de réception</Label>
                <Input
                  type="date"
                  value={newForm.reception_date}
                  onChange={(e) => setNewForm((f) => ({ ...f, reception_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Lignes de réception depuis le BdC */}
            {receptionLines.length > 0 && (
              <div className="space-y-2">
                <Label>Lignes de réception</Label>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-28 text-right">Attendu</TableHead>
                        <TableHead className="w-28 text-right">Reçu</TableHead>
                        <TableHead>Note ligne</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receptionLines.map((line, idx) => (
                        <TableRow key={line.po_item_id}>
                          <TableCell className="text-sm font-medium">{line.product_name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{line.expected}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={line.expected * 2}
                              value={line.received}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReceptionLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, received: val } : l))
                                );
                              }}
                              className="h-8 w-24 text-right ml-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Note…"
                              value={line.notes}
                              onChange={(e) =>
                                setReceptionLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, notes: e.target.value } : l))
                                )
                              }
                              className="h-8"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    Total attendu :{' '}
                    <strong className="text-foreground">
                      {receptionLines.reduce((s, l) => s + l.expected, 0)} unités
                    </strong>
                  </span>
                  <span>
                    Total reçu :{' '}
                    <strong className="text-foreground">
                      {receptionLines.reduce((s, l) => s + l.received, 0)} unités
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Notes globales */}
            <div className="space-y-1.5">
              <Label>Notes générales</Label>
              <Textarea
                placeholder="Commentaires sur la réception (état des colis, écarts, etc.)"
                value={newForm.notes}
                onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewDialog(false); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleCreateReception} disabled={submitting}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {submitting ? 'Enregistrement…' : 'Valider la réception'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
