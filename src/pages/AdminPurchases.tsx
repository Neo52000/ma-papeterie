import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Package, TrendingUp, Pencil, Trash2, X, Search, FileUp, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StockReceptions } from '@/components/admin/StockReceptions';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Supplier { id: string; name: string; }

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  supplier_id: string | null;
  suppliers?: { name: string } | null;
  total_ht?: number | null;
  total_ttc?: number | null;
  expected_delivery_date?: string | null;
  notes?: string | null;
  created_at?: string;
}

interface OrderItem {
  id?: string;           // undefined = ligne non encore persistée
  product_id?: string | null;
  supplier_product_id?: string | null;
  quantity: number;
  unit_price_ht: number;
  unit_price_ttc?: number | null;
  received_quantity?: number;
  products?: { name: string; sku_interne?: string; ean?: string } | null;
  // UI only
  _search?: string;
  _searchResults?: ProductSearchResult[];
}

interface ProductSearchResult {
  id: string;
  name: string;
  sku_interne?: string | null;
  ean?: string | null;
}

// PDF import types
interface PdfExtractedItem {
  ref: string;
  name: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  ean: string;
}

interface PdfExtractResult {
  order_number: string | null;
  order_date: string | null;
  supplier_name: string | null;
  total_ht: number | null;
  items: PdfExtractedItem[];
}

type PdfImportStep = 'select' | 'parsing' | 'review' | 'saving';

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:              { label: 'Brouillon',            variant: 'outline' },
  sent:               { label: 'Envoyé',               variant: 'secondary' },
  confirmed:          { label: 'Confirmé',             variant: 'default' },
  partially_received: { label: 'Partiellement reçu',  variant: 'secondary' },
  received:           { label: 'Reçu',                 variant: 'default' },
  cancelled:          { label: 'Annulé',               variant: 'destructive' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([value, { label }]) => ({ value, label }));

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminPurchases() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, isSuperAdmin } = useAuth();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    supplier_id: '',
    expected_delivery_date: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editHeader, setEditHeader] = useState({
    supplier_id: '',
    status: 'draft',
    expected_delivery_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // PDF import dialog
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [pdfStep, setPdfStep] = useState<PdfImportStep>('select');
  const [pdfSupplierId, setPdfSupplierId] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfExtractResult | null>(null);
  const [pdfItems, setPdfItems] = useState<PdfExtractedItem[]>([]);
  const [pdfError, setPdfError] = useState('');
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfParseProgress, setPdfParseProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isSuperAdmin))) navigate('/auth');
  }, [authLoading, user, isAdmin, isSuperAdmin, navigate]);

  useEffect(() => {
    if (user && (isAdmin || isSuperAdmin)) fetchData();
  }, [user, isAdmin, isSuperAdmin]);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('*, suppliers(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('suppliers')
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      setPurchaseOrders((ordersRes.data || []) as PurchaseOrder[]);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ─── Create BdC ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data: orderNumber, error: rpcError } = await supabase.rpc('generate_purchase_order_number');
      if (rpcError) throw rpcError;

      const { error: insertError } = await supabase.from('purchase_orders').insert({
        order_number: orderNumber,
        created_by: user?.id,
        status: 'draft',
        supplier_id: createForm.supplier_id || null,
        expected_delivery_date: createForm.expected_delivery_date || null,
        notes: createForm.notes || null,
      });
      if (insertError) throw insertError;

      toast.success('Bon de commande créé');
      setShowCreate(false);
      setCreateForm({ supplier_id: '', expected_delivery_date: '', notes: '' });
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // ─── Open edit dialog ─────────────────────────────────────────────────────
  const openEdit = async (order: PurchaseOrder) => {
    setEditOrder(order);
    setEditHeader({
      supplier_id: order.supplier_id || '',
      status: order.status || 'draft',
      expected_delivery_date: order.expected_delivery_date
        ? order.expected_delivery_date.split('T')[0]
        : '',
      notes: order.notes || '',
    });

    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*, products(name, sku_interne, ean)')
      .eq('purchase_order_id', order.id);

    if (error) { toast.error('Erreur chargement des lignes'); return; }
    setEditItems((data || []) as OrderItem[]);
  };

  // ─── Edit items helpers ────────────────────────────────────────────────────
  const addLine = () =>
    setEditItems((prev) => [...prev, { quantity: 1, unit_price_ht: 0, received_quantity: 0, _search: '' }]);

  const removeLine = (idx: number) =>
    setEditItems((prev) => prev.filter((_, i) => i !== idx));

  const patchLine = (idx: number, patch: Partial<OrderItem>) =>
    setEditItems((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  // Product search within a line
  const searchProducts = useCallback(async (idx: number, q: string) => {
    patchLine(idx, { _search: q });
    if (q.length < 2) { patchLine(idx, { _searchResults: [] }); return; }
    const { data } = await supabase
      .from('products')
      .select('id, name, sku_interne, ean')
      .or(`name.ilike.%${q}%,sku_interne.ilike.%${q}%,ean.ilike.%${q}%`)
      .limit(8);
    patchLine(idx, { _searchResults: (data || []) as ProductSearchResult[] });
  }, []);

  const selectProduct = (idx: number, p: ProductSearchResult) =>
    patchLine(idx, {
      product_id: p.id,
      products: { name: p.name, sku_interne: p.sku_interne ?? undefined, ean: p.ean ?? undefined },
      _search: p.name,
      _searchResults: [],
    });

  // ─── Total HT ────────────────────────────────────────────────────────────
  const totalHT = editItems.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price_ht || 0), 0);

  // ─── Save BdC ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editOrder) return;
    setSaving(true);
    try {
      // 1. Update header
      const { error: headErr } = await supabase
        .from('purchase_orders')
        .update({
          supplier_id: editHeader.supplier_id || null,
          status: editHeader.status,
          expected_delivery_date: editHeader.expected_delivery_date || null,
          notes: editHeader.notes || null,
          total_ht: totalHT,
        })
        .eq('id', editOrder.id);
      if (headErr) throw headErr;

      // 2. Delete removed lines (existing lines whose id is no longer in editItems)
      const { data: existingRows } = await supabase
        .from('purchase_order_items')
        .select('id')
        .eq('purchase_order_id', editOrder.id);

      const keptIds = new Set(editItems.filter((l) => l.id).map((l) => l.id));
      const toDelete = (existingRows || []).filter((r: any) => !keptIds.has(r.id)).map((r: any) => r.id);
      if (toDelete.length > 0) {
        await supabase.from('purchase_order_items').delete().in('id', toDelete);
      }

      // 3. Upsert lines
      for (const line of editItems) {
        const payload: any = {
          purchase_order_id: editOrder.id,
          product_id: line.product_id || null,
          supplier_product_id: line.supplier_product_id || null,
          quantity: line.quantity,
          unit_price_ht: line.unit_price_ht,
          unit_price_ttc: line.unit_price_ttc || null,
        };
        if (line.id) {
          await supabase.from('purchase_order_items').update(payload).eq('id', line.id);
        } else {
          await supabase.from('purchase_order_items').insert(payload);
        }
      }

      toast.success('Bon de commande enregistré');
      setEditOrder(null);
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete BdC ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editOrder) return;
    if (!confirm(`Supprimer définitivement ${editOrder.order_number} ?`)) return;
    setDeleting(true);
    try {
      // Delete items first (FK)
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', editOrder.id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', editOrder.id);
      if (error) throw error;
      toast.success('Bon de commande supprimé');
      setEditOrder(null);
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // ─── PDF Import logic ─────────────────────────────────────────────────────
  const resetPdfImport = () => {
    setPdfStep('select');
    setPdfSupplierId('');
    setPdfFile(null);
    setPdfResult(null);
    setPdfItems([]);
    setPdfError('');
    setPdfParseProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfParse = async () => {
    if (!pdfFile) return;
    setPdfStep('parsing');
    setPdfError('');
    setPdfParseProgress(10);

    try {
      const supplierName = suppliers.find((s) => s.id === pdfSupplierId)?.name || '';

      // Animate progress while waiting
      const progressInterval = setInterval(() => {
        setPdfParseProgress((p) => Math.min(p + 8, 85));
      }, 800);

      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('supplier', supplierName);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/parse-po-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setPdfParseProgress(95);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Erreur réseau' }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Erreur inconnue');

      const result: PdfExtractResult = json.data;
      setPdfResult(result);
      setPdfItems(result.items || []);
      setPdfParseProgress(100);
      setPdfStep('review');
    } catch (err: any) {
      setPdfError(err.message);
      setPdfStep('select');
    }
  };

  const patchPdfItem = (idx: number, patch: Partial<PdfExtractedItem>) =>
    setPdfItems((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const removePdfItem = (idx: number) =>
    setPdfItems((prev) => prev.filter((_, i) => i !== idx));

  const handlePdfConfirm = async () => {
    setPdfSaving(true);
    try {
      // 1. Générer numéro BdC
      const { data: orderNumber, error: rpcError } = await supabase.rpc('generate_purchase_order_number');
      if (rpcError) throw rpcError;

      const totalHT = pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);

      // 2. Créer le bon de commande
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          created_by: user?.id,
          status: 'draft',
          supplier_id: pdfSupplierId || null,
          total_ht: totalHT,
          notes: pdfResult?.order_number ? `Importé depuis PDF — BdC fournisseur : ${pdfResult.order_number}` : 'Importé depuis PDF',
          expected_delivery_date: null,
        })
        .select()
        .single();
      if (poErr) throw poErr;

      // 3. Insérer les lignes
      if (pdfItems.length > 0) {
        const itemsPayload = pdfItems.map((item) => ({
          purchase_order_id: po.id,
          product_id: null,
          supplier_product_id: item.ref || null,
          quantity: item.quantity,
          unit_price_ht: item.unit_price_ht,
          unit_price_ttc: item.unit_price_ht * (1 + item.vat_rate / 100),
        }));
        const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      toast.success(`BdC ${orderNumber} créé avec ${pdfItems.length} ligne(s)`);
      setShowPdfImport(false);
      resetPdfImport();
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setPdfSaving(false);
    }
  };

  // ─── Loading / auth ───────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <AdminLayout title="Gestion des Achats" description="Commandes fournisseurs et réceptions de stock">
        <div className="text-center py-10 text-muted-foreground">Chargement…</div>
      </AdminLayout>
    );
  }
  if (!user || (!isAdmin && !isSuperAdmin)) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Gestion des Achats" description="Commandes fournisseurs et réceptions de stock">
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <Package className="h-4 w-4 mr-2" />
            Bons de commande
          </TabsTrigger>
          <TabsTrigger value="receptions">
            <TrendingUp className="h-4 w-4 mr-2" />
            Réceptions de stock
          </TabsTrigger>
        </TabsList>

        {/* ── Onglet BdC ─────────────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { resetPdfImport(); setShowPdfImport(true); }}>
              <FileUp className="mr-2 h-4 w-4" />
              Importer un PDF
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bon de commande
            </Button>
          </div>

          {purchaseOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucun bon de commande</p>
              </CardContent>
            </Card>
          ) : (
            purchaseOrders.map((order) => (
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
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEdit(order)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Modifier
                    </Button>
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
        </TabsContent>

        {/* ── Onglet Réceptions ──────────────────────────────────────────── */}
        <TabsContent value="receptions">
          <StockReceptions />
        </TabsContent>
      </Tabs>

      {/* ── Dialog : Créer BdC ─────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau bon de commande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <Select value={createForm.supplier_id} onValueChange={(v) => setCreateForm((f) => ({ ...f, supplier_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date de livraison prévue</Label>
              <Input
                type="date"
                value={createForm.expected_delivery_date}
                onChange={(e) => setCreateForm((f) => ({ ...f, expected_delivery_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes internes…"
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Éditer BdC ────────────────────────────────────────────── */}
      <Dialog open={!!editOrder} onOpenChange={(open) => { if (!open) setEditOrder(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier — {editOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* En-tête BdC */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fournisseur</Label>
                <Select
                  value={editHeader.supplier_id}
                  onValueChange={(v) => setEditHeader((h) => ({ ...h, supplier_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={editHeader.status}
                  onValueChange={(v) => setEditHeader((h) => ({ ...h, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de livraison prévue</Label>
                <Input
                  type="date"
                  value={editHeader.expected_delivery_date}
                  onChange={(e) => setEditHeader((h) => ({ ...h, expected_delivery_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={editHeader.notes}
                  onChange={(e) => setEditHeader((h) => ({ ...h, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            {/* Lignes produits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Lignes de commande</Label>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter une ligne
                </Button>
              </div>

              {editItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  Aucune ligne — cliquez sur "Ajouter une ligne"
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-24 text-right">Qté commandée</TableHead>
                        <TableHead className="w-32 text-right">Prix unit. HT</TableHead>
                        <TableHead className="w-24 text-right">Qté reçue</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editItems.map((line, idx) => (
                        <TableRow key={idx}>
                          {/* Produit */}
                          <TableCell className="relative">
                            {line.products?.name ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">{line.products.name}</span>
                                <button
                                  className="text-muted-foreground hover:text-foreground ml-1"
                                  onClick={() => patchLine(idx, { product_id: null, products: null, _search: '', _searchResults: [] })}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="flex items-center border rounded-md px-2 py-1 gap-1.5">
                                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <input
                                    className="text-sm bg-transparent outline-none w-full"
                                    placeholder="Rechercher un produit…"
                                    value={line._search || ''}
                                    onChange={(e) => searchProducts(idx, e.target.value)}
                                  />
                                </div>
                                {(line._searchResults?.length ?? 0) > 0 && (
                                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md">
                                    {line._searchResults!.map((p) => (
                                      <button
                                        key={p.id}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                        onClick={() => selectProduct(idx, p)}
                                      >
                                        <span className="font-medium">{p.name}</span>
                                        {p.sku_interne && <span className="ml-2 text-muted-foreground text-xs">{p.sku_interne}</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          {/* Quantité */}
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              className="text-right h-8"
                              value={line.quantity}
                              onChange={(e) => patchLine(idx, { quantity: parseInt(e.target.value) || 1 })}
                            />
                          </TableCell>
                          {/* Prix HT */}
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="text-right h-8"
                              value={line.unit_price_ht}
                              onChange={(e) => patchLine(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
                            />
                          </TableCell>
                          {/* Reçu (lecture seule) */}
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {line.received_quantity ?? 0}
                          </TableCell>
                          {/* Supprimer */}
                          <TableCell>
                            <button
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => removeLine(idx)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Total HT */}
              {editItems.length > 0 && (
                <div className="flex justify-end pt-1">
                  <span className="text-sm font-semibold">
                    Total HT : <span className="text-primary">{totalHT.toFixed(2)} €</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2">
            {/* Suppression — uniquement si brouillon */}
            {editOrder?.status === 'draft' && (
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {deleting ? 'Suppression…' : 'Supprimer'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setEditOrder(null)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Import PDF ────────────────────────────────────────────── */}
      <Dialog open={showPdfImport} onOpenChange={(open) => { if (!open) { setShowPdfImport(false); resetPdfImport(); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Importer un bon de commande PDF
            </DialogTitle>
            <DialogDescription>
              L'IA analyse le PDF et extrait automatiquement les lignes produits. Vérifiez les données avant de créer le BdC.
            </DialogDescription>
          </DialogHeader>

          {/* Step: select */}
          {pdfStep === 'select' && (
            <div className="space-y-5 py-2">
              {pdfError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{pdfError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Fournisseur</Label>
                <Select value={pdfSupplierId} onValueChange={setPdfSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le fournisseur (facultatif mais recommandé)" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Fichier PDF</Label>
                <div
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setPdfFile(f);
                      setPdfError('');
                    }}
                  />
                  {pdfFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-10 w-10 text-primary" />
                      <p className="font-medium text-sm">{pdfFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(0)} Ko</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />Changer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileUp className="h-10 w-10" />
                      <p className="text-sm">Cliquez pour sélectionner un PDF</p>
                      <p className="text-xs">ou glissez-déposez ici</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowPdfImport(false); resetPdfImport(); }}>Annuler</Button>
                <Button onClick={handlePdfParse} disabled={!pdfFile}>
                  <Search className="h-4 w-4 mr-2" />
                  Analyser le PDF
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: parsing */}
          {pdfStep === 'parsing' && (
            <div className="py-10 flex flex-col items-center gap-6">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="w-full max-w-sm space-y-2">
                <p className="text-center text-sm font-medium">Analyse en cours…</p>
                <Progress value={pdfParseProgress} className="h-2" />
                <p className="text-center text-xs text-muted-foreground">L'IA extrait les lignes produits du document</p>
              </div>
            </div>
          )}

          {/* Step: review */}
          {pdfStep === 'review' && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-md text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-foreground">
                  <strong>{pdfItems.length} ligne(s)</strong> extraite(s)
                  {pdfResult?.supplier_name && ` · Fournisseur détecté : ${pdfResult.supplier_name}`}
                  {pdfResult?.order_number && ` · Réf. fournisseur : ${pdfResult.order_number}`}
                </span>
              </div>

              {/* Fournisseur override si pas encore sélectionné */}
              {!pdfSupplierId && (
                <div className="space-y-1.5">
                  <Label>Fournisseur (à sélectionner)</Label>
                  <Select value={pdfSupplierId} onValueChange={setPdfSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Table des lignes extraites */}
              {pdfItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-md">
                  Aucune ligne extraite. Revenez en arrière pour réessayer.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Réf.</TableHead>
                        <TableHead>Désignation</TableHead>
                        <TableHead className="w-20 text-right">Qté</TableHead>
                        <TableHead className="w-28 text-right">PU HT (€)</TableHead>
                        <TableHead className="w-16 text-right">TVA %</TableHead>
                        <TableHead className="w-24 text-right">Total HT</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pdfItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <input
                              className="text-xs bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full"
                              value={item.ref}
                              onChange={(e) => patchPdfItem(idx, { ref: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full"
                              value={item.name}
                              onChange={(e) => patchPdfItem(idx, { name: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              min={1}
                              className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full text-right"
                              value={item.quantity}
                              onChange={(e) => patchPdfItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full text-right"
                              value={item.unit_price_ht}
                              onChange={(e) => patchPdfItem(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              className="text-sm bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none w-full text-right"
                              value={item.vat_rate}
                              onChange={(e) => patchPdfItem(idx, { vat_rate: parseFloat(e.target.value) || 20 })}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {(item.quantity * item.unit_price_ht).toFixed(2)} €
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => removePdfItem(idx)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Total */}
              {pdfItems.length > 0 && (
                <div className="flex justify-end text-sm font-semibold">
                  Total HT : <span className="text-primary ml-2">
                    {pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0).toFixed(2)} €
                  </span>
                </div>
              )}

              <DialogFooter className="flex-row justify-between gap-2">
                <Button variant="outline" onClick={() => { setPdfStep('select'); setPdfError(''); }}>
                  ← Recommencer
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setShowPdfImport(false); resetPdfImport(); }}>
                    Annuler
                  </Button>
                  <Button onClick={handlePdfConfirm} disabled={pdfSaving || pdfItems.length === 0}>
                    {pdfSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création…</> : <>Créer le bon de commande</>}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

