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
import { Plus, PackageCheck, CheckCircle2, Clock, ChevronDown, ChevronRight, TrendingUp, AlertTriangle, CheckCheck, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type LineStatus = 'recu' | 'partiel' | 'litige' | 'non_livre';

const LINE_STATUS_CONFIG: Record<LineStatus, { label: string; color: string }> = {
  recu: { label: '✅ Reçu complet', color: 'text-green-600' },
  partiel: { label: '🟡 Partiel', color: 'text-yellow-600' },
  litige: { label: '🔴 Litige', color: 'text-destructive' },
  non_livre: { label: '⚫ Non livré', color: 'text-muted-foreground' },
};

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

interface ReceptionLine {
  po_item_id: string;
  product_name: string;
  sku: string;
  expected: number;
  received: number;
  status: LineStatus;
  notes: string;
}

interface EditLine {
  id: string;
  product_id?: string;
  product_name: string;
  sku: string;
  expected: number;
  received: number;
  status: LineStatus;
  notes: string;
  originalReceived: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'outline' },
  in_progress: { label: 'En cours', variant: 'secondary' },
  completed: { label: 'Complète', variant: 'default' },
  partial: { label: 'Partielle', variant: 'secondary' },
};

function parseLineStatus(notes: string | undefined): LineStatus {
  if (!notes) return 'recu';
  if (notes.includes('✅')) return 'recu';
  if (notes.includes('🟡')) return 'partiel';
  if (notes.includes('🔴')) return 'litige';
  if (notes.includes('⚫')) return 'non_livre';
  return 'recu';
}

export function StockReceptions() {
  const { user } = useAuth();
  const [receptions, setReceptions] = useState<StockReception[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [expandedReceptions, setExpandedReceptions] = useState<Set<string>>(new Set());
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  // Edit dialog state
  const [editingReception, setEditingReception] = useState<StockReception | null>(null);
  const [editLines, setEditLines] = useState<EditLine[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [newForm, setNewForm] = useState({
    purchase_order_id: '',
    reception_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [receptionLines, setReceptionLines] = useState<ReceptionLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

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
          .select('id, order_number, status, total_ht, expected_delivery_date, suppliers(name)')
          .not('status', 'eq', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(200),
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

    if (error) { toast.error('Erreur lors du chargement des lignes de commande'); return; }

    const items = (data || []) as PurchaseOrderItem[];
    setPoItems(items);
    setReceptionLines(
      items.map((item) => ({
        po_item_id: item.id,
        product_name: item.products?.name || 'Produit inconnu',
        sku: item.products?.sku_interne || item.products?.ean || '',
        expected: item.quantity,
        received: item.quantity,
        status: 'recu' as LineStatus,
        notes: '',
      }))
    );
  };

  const handlePoChange = async (poId: string) => {
    const resolvedId = poId === '__none__' ? '' : poId;
    setNewForm((f) => ({ ...f, purchase_order_id: resolvedId }));
    if (resolvedId) await loadPoItems(resolvedId);
    else { setPoItems([]); setReceptionLines([]); }
  };

  const updateLine = (idx: number, patch: Partial<ReceptionLine>) =>
    setReceptionLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const validateAll = () =>
    setReceptionLines((prev) =>
      prev.map((l) => ({ ...l, received: l.expected, status: 'recu' as LineStatus }))
    );

  const handleStatusChange = (idx: number, status: LineStatus) => {
    const line = receptionLines[idx];
    let received = line.received;
    if (status === 'recu') received = line.expected;
    if (status === 'non_livre') received = 0;
    updateLine(idx, { status, received });
  };

  const handleCreateReception = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const receptionNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const { data: reception, error: recError } = await supabase
        .from('stock_receptions')
        .insert({
          purchase_order_id: newForm.purchase_order_id || null,
          reception_date: newForm.reception_date
            ? new Date(newForm.reception_date).toISOString()
            : new Date().toISOString(),
          notes: newForm.notes || null,
          received_by: user.id,
          status: 'in_progress',
          reception_number: receptionNumber,
        })
        .select()
        .single();

      if (recError) throw recError;

      if (receptionLines.length > 0 && reception) {
        const itemsToInsert = receptionLines.map((line) => {
          const poItem = poItems.find((p) => p.id === line.po_item_id);
          const noteWithStatus = [
            LINE_STATUS_CONFIG[line.status]?.label,
            line.notes,
          ].filter(Boolean).join(' — ');
          return {
            reception_id: reception.id,
            product_id: poItem?.product_id || null,
            purchase_order_item_id: line.po_item_id,
            expected_quantity: line.expected,
            received_quantity: line.received,
            notes: noteWithStatus || null,
          };
        });

        const { error: itemsError } = await supabase
          .from('stock_reception_items')
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;

        // Update stock for received items
        for (const line of receptionLines) {
          if (line.received <= 0) continue;
          const poItem = poItems.find((p) => p.id === line.po_item_id);
          if (poItem?.product_id) {
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
        const allReceived = receptionLines.every((l) => l.status === 'recu');
        const noneReceived = receptionLines.every((l) => l.status === 'non_livre');
        if (newForm.purchase_order_id && !noneReceived) {
          await supabase
            .from('purchase_orders')
            .update({ status: allReceived ? 'received' : 'partially_received' })
            .eq('id', newForm.purchase_order_id);
        }
      }

      // Determine reception global status
      const hasLitige = receptionLines.some((l) => l.status === 'litige');
      const allComplete = receptionLines.every((l) => l.status === 'recu');
      const globalStatus = hasLitige ? 'partial' : allComplete ? 'completed' : 'partial';

      await supabase
        .from('stock_receptions')
        .update({ status: receptionLines.length > 0 ? globalStatus : 'in_progress' })
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

  // ──────────────────────────────────────────────
  // Edit reception
  // ──────────────────────────────────────────────
  const openEditDialog = (reception: StockReception) => {
    const items = reception.stock_reception_items || [];
    const lines: EditLine[] = items.map((item) => {
      const status = parseLineStatus(item.notes);
      // Extract user note (part after the status label)
      const noteLabel = LINE_STATUS_CONFIG[status]?.label ?? '';
      const rawNote = item.notes || '';
      const userNote = rawNote.startsWith(noteLabel)
        ? rawNote.slice(noteLabel.length).replace(/^[\s—]+/, '')
        : rawNote;
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || '—',
        sku: item.products?.sku_interne || item.products?.ean || '',
        expected: item.expected_quantity,
        received: item.received_quantity,
        originalReceived: item.received_quantity,
        status,
        notes: userNote,
      };
    });
    setEditLines(lines);
    setEditNotes(reception.notes || '');
    setEditingReception(reception);
  };

  const updateEditLine = (idx: number, patch: Partial<EditLine>) =>
    setEditLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const handleEditStatusChange = (idx: number, status: LineStatus) => {
    const line = editLines[idx];
    let received = line.received;
    if (status === 'recu') received = line.expected;
    if (status === 'non_livre') received = 0;
    updateEditLine(idx, { status, received });
  };

  const validateAllEdit = () =>
    setEditLines((prev) =>
      prev.map((l) => ({ ...l, received: l.expected, status: 'recu' as LineStatus }))
    );

  const handleSaveEdit = async () => {
    if (!editingReception) return;
    setSavingEdit(true);
    try {
      // Update each line
      for (const line of editLines) {
        const noteWithStatus = [
          LINE_STATUS_CONFIG[line.status]?.label,
          line.notes,
        ].filter(Boolean).join(' — ');

        await supabase
          .from('stock_reception_items')
          .update({
            received_quantity: line.received,
            notes: noteWithStatus || null,
          })
          .eq('id', line.id);

        // Adjust stock if quantity changed
        const delta = line.received - line.originalReceived;
        if (delta !== 0 && line.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', line.product_id)
            .single();
          if (prod) {
            await supabase
              .from('products')
              .update({ stock_quantity: Math.max(0, (prod.stock_quantity || 0) + delta) })
              .eq('id', line.product_id);
          }
        }
      }

      // Recalculate global status
      const hasLitige = editLines.some((l) => l.status === 'litige');
      const allReceived = editLines.every((l) => l.status === 'recu');
      const globalStatus = hasLitige ? 'partial' : allReceived ? 'completed' : 'partial';

      await supabase
        .from('stock_receptions')
        .update({
          status: editLines.length > 0 ? globalStatus : editingReception.status,
          notes: editNotes || null,
        })
        .eq('id', editingReception.id);

      toast.success('Réception mise à jour avec succès');
      setEditingReception(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // ──────────────────────────────────────────────

  const totalReceived = receptions.reduce(
    (sum, r) => sum + (r.stock_reception_items?.reduce((s, i) => s + i.received_quantity, 0) || 0),
    0
  );

  const summaryStats = {
    total: receptionLines.reduce((s, l) => s + l.expected, 0),
    received: receptionLines.reduce((s, l) => s + l.received, 0),
    litige: receptionLines.filter((l) => l.status === 'litige').length,
    nonLivre: receptionLines.filter((l) => l.status === 'non_livre').length,
  };

  const editSummaryStats = {
    total: editLines.reduce((s, l) => s + l.expected, 0),
    received: editLines.reduce((s, l) => s + l.received, 0),
    litige: editLines.filter((l) => l.status === 'litige').length,
    nonLivre: editLines.filter((l) => l.status === 'non_livre').length,
  };

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

      {/* Header */}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(reception); }}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {/* BdC summary info */}
                    {reception.purchase_orders && (
                      <div className="flex flex-wrap gap-4 p-3 rounded-md bg-muted/50 text-sm">
                        <div>
                          <span className="text-muted-foreground">Bon de commande : </span>
                          <span className="font-semibold">{reception.purchase_orders.order_number}</span>
                        </div>
                        {reception.purchase_orders.suppliers?.name && (
                          <div>
                            <span className="text-muted-foreground">Fournisseur : </span>
                            <span className="font-semibold">{reception.purchase_orders.suppliers.name}</span>
                          </div>
                        )}
                        {reception.reception_date && (
                          <div>
                            <span className="text-muted-foreground">Date réception : </span>
                            <span className="font-semibold">
                              {format(new Date(reception.reception_date), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lines table */}
                    {items.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Référence</TableHead>
                            <TableHead className="text-right">Attendu</TableHead>
                            <TableHead className="text-right">Reçu</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => {
                            const lineStatus = parseLineStatus(item.notes);
                            const statusCfg = LINE_STATUS_CONFIG[lineStatus];
                            const noteLabel = statusCfg?.label ?? '';
                            const rawNote = item.notes || '';
                            const userNote = rawNote.startsWith(noteLabel)
                              ? rawNote.slice(noteLabel.length).replace(/^[\s—]+/, '')
                              : rawNote;
                            return (
                              <TableRow
                                key={item.id}
                                className={
                                  lineStatus === 'litige'
                                    ? 'bg-destructive/5'
                                    : lineStatus === 'non_livre'
                                    ? 'bg-muted/40'
                                    : ''
                                }
                              >
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
                                <TableCell>
                                  <span className={`text-xs font-medium ${statusCfg?.color ?? ''}`}>
                                    {statusCfg?.label ?? '—'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {userNote || '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune ligne de réception enregistrée pour ce bon.
                      </p>
                    )}

                    {/* Global note */}
                    {reception.notes && (
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                        <strong>Note globale : </strong>{reception.notes}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Edit Reception Dialog ─────────────────────────────────── */}
      <Dialog open={!!editingReception} onOpenChange={(o) => { if (!o) setEditingReception(null); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifier la réception — {editingReception?.reception_number || editingReception?.id?.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {editLines.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Lignes de réception ({editLines.length})</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={validateAllEdit}
                    className="gap-1.5"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Valider tout comme reçu
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-24 text-right">Attendu</TableHead>
                        <TableHead className="w-24 text-right">Reçu</TableHead>
                        <TableHead className="w-44">Statut ligne</TableHead>
                        <TableHead>Note / Motif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editLines.map((line, idx) => (
                        <TableRow
                          key={line.id}
                          className={
                            line.status === 'litige'
                              ? 'bg-destructive/5'
                              : line.status === 'non_livre'
                              ? 'bg-muted/50'
                              : ''
                          }
                        >
                          <TableCell className="text-sm">
                            <div className="font-medium">{line.product_name}</div>
                            {line.sku && <div className="text-xs text-muted-foreground">{line.sku}</div>}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{line.expected}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={line.expected * 2}
                              value={line.received}
                              disabled={line.status === 'non_livre'}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                let status: LineStatus = line.status;
                                if (val === 0) status = 'non_livre';
                                else if (val < line.expected) status = 'partiel';
                                else if (val === line.expected && line.status !== 'litige') status = 'recu';
                                updateEditLine(idx, { received: val, status });
                              }}
                              className="h-8 w-20 text-right ml-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={line.status}
                              onValueChange={(v) => handleEditStatusChange(idx, v as LineStatus)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="recu">✅ Reçu complet</SelectItem>
                                <SelectItem value="partiel">🟡 Partiel</SelectItem>
                                <SelectItem value="litige">🔴 Litige</SelectItem>
                                <SelectItem value="non_livre">⚫ Non livré</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder={line.status === 'litige' ? 'Motif du litige…' : 'Note optionnelle…'}
                              value={line.notes}
                              onChange={(e) => updateEditLine(idx, { notes: e.target.value })}
                              className={`h-8 ${line.status === 'litige' ? 'border-destructive/50' : ''}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary bar */}
                <div className="flex flex-wrap gap-4 text-sm p-3 bg-muted/50 rounded-md">
                  <span>
                    Attendu : <strong className="text-foreground">{editSummaryStats.total} u.</strong>
                  </span>
                  <span>
                    Reçu : <strong className="text-primary">{editSummaryStats.received} u.</strong>
                  </span>
                  {editSummaryStats.litige > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <strong>{editSummaryStats.litige} litige(s)</strong>
                    </span>
                  )}
                  {editSummaryStats.nonLivre > 0 && (
                    <span className="text-muted-foreground">
                      Non livrés : <strong>{editSummaryStats.nonLivre} ligne(s)</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {editLines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune ligne de réception à modifier pour cette réception.
              </p>
            )}

            {/* Notes globales */}
            <div className="space-y-1.5">
              <Label>Notes générales</Label>
              <Textarea
                placeholder="Commentaires sur la réception…"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReception(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {savingEdit ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── New Reception Dialog ──────────────────────────────────── */}
      <Dialog open={showNewDialog} onOpenChange={(o) => { setShowNewDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Nouvelle réception de stock
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* BdC + Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bon de commande</Label>
                <Select value={newForm.purchase_order_id || '__none__'} onValueChange={handlePoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un BdC…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sans bon de commande —</SelectItem>
                    {purchaseOrders.length === 0 && (
                      <SelectItem value="__empty__" disabled>Aucun BdC disponible</SelectItem>
                    )}
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        <span className="font-medium">{po.order_number}</span>
                        {po.suppliers?.name && (
                          <span className="text-muted-foreground ml-2">— {po.suppliers.name}</span>
                        )}
                        <Badge variant="outline" className="ml-2 text-xs">{po.status}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {purchaseOrders.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun BdC trouvé. Vérifiez que des bons de commande existent en base.
                  </p>
                )}
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

            {/* Lignes de réception */}
            {receptionLines.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Lignes de réception ({receptionLines.length})</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={validateAll}
                    className="gap-1.5"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Valider tout comme reçu
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-24 text-right">Attendu</TableHead>
                        <TableHead className="w-24 text-right">Reçu</TableHead>
                        <TableHead className="w-44">Statut ligne</TableHead>
                        <TableHead>Note / Motif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receptionLines.map((line, idx) => (
                        <TableRow
                          key={line.po_item_id}
                          className={
                            line.status === 'litige'
                              ? 'bg-destructive/5'
                              : line.status === 'non_livre'
                              ? 'bg-muted/50'
                              : ''
                          }
                        >
                          <TableCell className="text-sm">
                            <div className="font-medium">{line.product_name}</div>
                            {line.sku && <div className="text-xs text-muted-foreground">{line.sku}</div>}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{line.expected}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={line.expected * 2}
                              value={line.received}
                              disabled={line.status === 'non_livre'}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                let status: LineStatus = line.status;
                                if (val === 0) status = 'non_livre';
                                else if (val < line.expected) status = 'partiel';
                                else if (val === line.expected && line.status !== 'litige') status = 'recu';
                                updateLine(idx, { received: val, status });
                              }}
                              className="h-8 w-20 text-right ml-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={line.status}
                              onValueChange={(v) => handleStatusChange(idx, v as LineStatus)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="recu">✅ Reçu complet</SelectItem>
                                <SelectItem value="partiel">🟡 Partiel</SelectItem>
                                <SelectItem value="litige">🔴 Litige</SelectItem>
                                <SelectItem value="non_livre">⚫ Non livré</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder={line.status === 'litige' ? 'Motif du litige…' : 'Note optionnelle…'}
                              value={line.notes}
                              onChange={(e) => updateLine(idx, { notes: e.target.value })}
                              className={`h-8 ${line.status === 'litige' ? 'border-destructive/50' : ''}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary bar */}
                <div className="flex flex-wrap gap-4 text-sm p-3 bg-muted/50 rounded-md">
                  <span>
                    Attendu : <strong className="text-foreground">{summaryStats.total} u.</strong>
                  </span>
                  <span>
                    Reçu : <strong className="text-primary">{summaryStats.received} u.</strong>
                  </span>
                  {summaryStats.litige > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <strong>{summaryStats.litige} litige(s)</strong>
                    </span>
                  )}
                  {summaryStats.nonLivre > 0 && (
                    <span className="text-muted-foreground">
                      Non livrés : <strong>{summaryStats.nonLivre} ligne(s)</strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Notes globales */}
            <div className="space-y-1.5">
              <Label>Notes générales</Label>
              <Textarea
                placeholder="Commentaires sur la réception (état des colis, écarts, conditions de livraison…)"
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
