import { useEffect, useState, useRef } from 'react';
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
import {
  Plus, Package, TrendingUp, Pencil, Trash2, X, Search, FileUp, Loader2,
  CheckCircle2, AlertCircle, FileText, ShoppingCart, Clock, Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StockReceptions } from '@/components/admin/StockReceptions';
import { ProductAutocomplete, type ProductMatch } from '@/components/admin/ProductAutocomplete';

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
  // UI only — matched product
  _product?: ProductMatch | null;
}

// PDF import types
interface PdfExtractedItem {
  ref: string;
  name: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  ean: string;
  // Auto-resolved after parsing
  matched_product_id?: string | null;
  matched_product_name?: string | null;
}

interface PdfExtractResult {
  order_number: string | null;
  order_date: string | null;
  supplier_name: string | null;
  total_ht: number | null;
  items: PdfExtractedItem[];
}

type PdfImportStep = 'select' | 'parsing' | 'review' | 'saving';

interface ReceiveLine {
  po_item_id:   string;
  product_id:   string | null;
  product_name: string;
  expected:     number;   // reliquat à recevoir
  received:     number;
  status:       'recu' | 'partiel' | 'non_livre';
}

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

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
  const [pdfDragging, setPdfDragging] = useState(false);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const xlsInputRef     = useRef<HTMLInputElement>(null);

  // XLS/CSV import dialog
  const [showXlsImport, setShowXlsImport]   = useState(false);
  const [xlsSupplierId, setXlsSupplierId]   = useState('');
  const [xlsPreview, setXlsPreview]         = useState<PdfExtractedItem[]>([]);
  const [xlsSaving, setXlsSaving]           = useState(false);
  const [xlsError, setXlsError]             = useState('');

  // Reception dialog
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveMode, setReceiveMode]       = useState<'global' | 'lines'>('global');
  const [receiveLines, setReceiveLines]     = useState<ReceiveLine[]>([]);
  const [receiving, setReceiving]           = useState(false);

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

  // ─── KPI stats ────────────────────────────────────────────────────────────
  const kpiStats = {
    total: purchaseOrders.length,
    drafts: purchaseOrders.filter(o => o.status === 'draft').length,
    pending: purchaseOrders.filter(o => ['sent', 'confirmed'].includes(o.status || '')).length,
    totalHT: purchaseOrders.reduce((s, o) => s + (o.total_ht || 0), 0),
  };

  // ─── Filtered orders ──────────────────────────────────────────────────────
  const filteredOrders = purchaseOrders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      o.order_number?.toLowerCase().includes(q) ||
      (o.suppliers?.name ?? '').toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
      .select('*, products(name, sku_interne, ean, cost_price)')
      .eq('purchase_order_id', order.id);

    if (error) { toast.error('Erreur chargement des lignes'); return; }

    const items: OrderItem[] = (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      supplier_product_id: row.supplier_product_id,
      quantity: row.quantity,
      unit_price_ht: row.unit_price_ht,
      unit_price_ttc: row.unit_price_ttc,
      received_quantity: row.received_quantity,
      _product: row.products
        ? { id: row.product_id, name: row.products.name, sku_interne: row.products.sku_interne, ean: row.products.ean, cost_price: row.products.cost_price }
        : null,
    }));
    setEditItems(items);
  };

  // ─── Edit items helpers ────────────────────────────────────────────────────
  const addLine = () =>
    setEditItems((prev) => [...prev, { quantity: 1, unit_price_ht: 0, received_quantity: 0, _product: null }]);

  const removeLine = (idx: number) =>
    setEditItems((prev) => prev.filter((_, i) => i !== idx));

  const patchLine = (idx: number, patch: Partial<OrderItem>) =>
    setEditItems((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const handleProductSelect = (idx: number, p: ProductMatch | null) => {
    patchLine(idx, {
      _product: p,
      product_id: p?.id ?? null,
      unit_price_ht: p?.cost_price != null ? p.cost_price : editItems[idx]?.unit_price_ht ?? 0,
    });
  };

  // ─── Totals ───────────────────────────────────────────────────────────────
  const totalHT = editItems.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price_ht || 0), 0);
  const totalTTC = editItems.reduce((s, l) => {
    const ht = (l.quantity || 0) * (l.unit_price_ht || 0);
    return s + (l.unit_price_ttc != null ? (l.quantity || 0) * l.unit_price_ttc : ht * 1.2);
  }, 0);

  // ─── Save BdC (batch) ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editOrder) return;
    setSaving(true);
    try {
      // 1. Update header with both totals
      const { error: headErr } = await supabase
        .from('purchase_orders')
        .update({
          supplier_id: editHeader.supplier_id || null,
          status: editHeader.status,
          expected_delivery_date: editHeader.expected_delivery_date || null,
          notes: editHeader.notes || null,
          total_ht: totalHT,
          total_ttc: totalTTC,
        })
        .eq('id', editOrder.id);
      if (headErr) throw headErr;

      // 2. Delete removed lines
      const { data: existingRows } = await supabase
        .from('purchase_order_items')
        .select('id')
        .eq('purchase_order_id', editOrder.id);

      const keptIds = new Set(editItems.filter((l) => l.id).map((l) => l.id));
      const toDelete = (existingRows || []).filter((r: any) => !keptIds.has(r.id)).map((r: any) => r.id);
      if (toDelete.length > 0) {
        await supabase.from('purchase_order_items').delete().in('id', toDelete);
      }

      // 3. Batch insert new lines (no id yet)
      const newLines = editItems.filter(l => !l.id);
      if (newLines.length > 0) {
        const insertPayload = newLines.map(line => ({
          purchase_order_id: editOrder.id,
          product_id: line.product_id || null,
          supplier_product_id: line.supplier_product_id || null,
          quantity: line.quantity,
          unit_price_ht: line.unit_price_ht,
          unit_price_ttc: line.unit_price_ttc || null,
        }));
        const { error: insertErr } = await supabase.from('purchase_order_items').insert(insertPayload);
        if (insertErr) throw insertErr;
      }

      // 4. Batch upsert existing lines
      const existingLines = editItems.filter(l => l.id);
      if (existingLines.length > 0) {
        const upsertPayload = existingLines.map(line => ({
          id: line.id,
          purchase_order_id: editOrder.id,
          product_id: line.product_id || null,
          supplier_product_id: line.supplier_product_id || null,
          quantity: line.quantity,
          unit_price_ht: line.unit_price_ht,
          unit_price_ttc: line.unit_price_ttc || null,
        }));
        const { error: upsertErr } = await supabase
          .from('purchase_order_items')
          .upsert(upsertPayload, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
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

  // ─── Delete BdC (depuis la liste) ────────────────────────────────────────
  const handleDeleteOrder = async (order: PurchaseOrder) => {
    if (!confirm(`Supprimer définitivement ${order.order_number} ?\nCette action est irréversible.`)) return;
    try {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', order.id);
      if (error) throw error;
      toast.success('Bon de commande supprimé');
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    }
  };

  // ─── Reception ────────────────────────────────────────────────────────────
  const openReceive = async (order: PurchaseOrder) => {
    const { data: items, error } = await supabase
      .from('purchase_order_items')
      .select('id, product_id, supplier_product_id, quantity, received_quantity, products(name)')
      .eq('purchase_order_id', order.id);

    if (error) { toast.error('Erreur chargement des lignes'); return; }

    const lines: ReceiveLine[] = (items ?? []).map((item: any) => {
      const reliquat = Math.max(0, item.quantity - (item.received_quantity ?? 0));
      return {
        po_item_id:   item.id,
        product_id:   item.product_id ?? null,
        product_name: item.products?.name ?? item.supplier_product_id ?? 'Produit inconnu',
        expected:     reliquat,
        received:     reliquat,
        status:       'recu' as const,
      };
    });

    setReceiveLines(lines);
    setReceiveMode('global');
    setReceivingOrder(order);
  };

  const handleReceive = async () => {
    if (!receivingOrder) return;
    setReceiving(true);
    try {
      const linesToProcess = receiveLines.filter(l => l.received > 0 && l.product_id);

      // 1. Incrémente le stock local des produits
      for (const line of linesToProcess) {
        const { data: prod } = await supabase
          .from('products').select('stock_quantity').eq('id', line.product_id!).single();
        if (prod) {
          await supabase.from('products')
            .update({ stock_quantity: (prod.stock_quantity || 0) + line.received })
            .eq('id', line.product_id!);
        }
      }

      // 2. Mise à jour de received_quantity sur les lignes BdC
      for (const line of receiveLines) {
        if (line.received === 0) continue;
        const { data: poi } = await supabase
          .from('purchase_order_items').select('received_quantity').eq('id', line.po_item_id).single();
        await supabase.from('purchase_order_items')
          .update({ received_quantity: (poi?.received_quantity ?? 0) + line.received })
          .eq('id', line.po_item_id);
      }

      // 3. Créer stock_reception + items (traçabilité)
      const recNum = `REC-${new Date().getFullYear()}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
      const totalRecv = receiveLines.reduce((s, l) => s + l.received, 0);
      const totalExp  = receiveLines.reduce((s, l) => s + l.expected, 0);

      const { data: rec } = await supabase.from('stock_receptions').insert({
        purchase_order_id: receivingOrder.id,
        reception_number:  recNum,
        reception_date:    new Date().toISOString(),
        status:            totalRecv >= totalExp ? 'completed' : 'partial',
        received_by:       user!.id,
      }).select('id').single();

      if (rec) {
        await supabase.from('stock_reception_items').insert(
          receiveLines.map(l => ({
            reception_id:           rec.id,
            product_id:             l.product_id,
            purchase_order_item_id: l.po_item_id,
            expected_quantity:      l.expected,
            received_quantity:      l.received,
            notes: l.status === 'recu'    ? '✅ Reçu'
                 : l.status === 'partiel' ? '🟡 Partiel'
                 :                         '⚫ Non livré',
          }))
        );
      }

      // 4. Statut BdC
      const newStatus = totalRecv >= totalExp ? 'received' : 'partially_received';
      await supabase.from('purchase_orders')
        .update({ status: newStatus }).eq('id', receivingOrder.id);

      toast.success(`Réception ${recNum} — ${totalRecv} unité(s) ajoutée(s) au stock`);
      setReceivingOrder(null);
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setReceiving(false);
    }
  };

  // ─── XLS/CSV Import logic ─────────────────────────────────────────────────
  const handleXlsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsError('');
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);

      // Normalise les accents + casse pour la comparaison de colonnes
      const norm = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

      const find = (row: Record<string, string>, ...keys: string[]) => {
        for (const key of keys) {
          const nk = norm(key);
          const found = Object.entries(row).find(([k]) => norm(k).includes(nk));
          if (found && String(found[1]).trim() !== '') return String(found[1]).trim();
        }
        return '';
      };

      const parseRows = (rows: Record<string, string>[]) =>
        rows.slice(0, 500).map(row => ({
          ref:           find(row, 'référence', 'reference', 'ref', 'sku', 'code article', 'codearticle'),
          name:          find(row, 'description', 'désignation', 'designation', 'libellé', 'libelle', 'name', 'nom', 'produit', 'article'),
          quantity:      parseFloat(String(find(row, 'quantité', 'quantite', 'qty', 'qté', 'qte', 'quantity') || '1').replace(',', '.')) || 1,
          unit_price_ht: parseFloat(String(find(row, 'prix unitaire', 'pu ht', 'pu_ht', 'puht', 'prix', 'price', 'coût', 'cout') || '0').replace(',', '.')) || 0,
          vat_rate:      parseFloat(String(find(row, 'tva', 'vat', 'taxe') || '20').replace(',', '.')) || 20,
          ean:           find(row, 'ean', 'code barre', 'codebarre', 'gtin', 'barcode'),
        })).filter(r => r.name);

      // Essayer toutes les feuilles, garder celle avec le plus de lignes valides
      let items: ReturnType<typeof parseRows> = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        const parsed = parseRows(rows);
        if (parsed.length > items.length) items = parsed;
      }

      if (items.length === 0) {
        setXlsError('Aucune ligne détectée. Colonnes attendues : "Description" (ou "Désignation"), "Quantité", "Prix".');
        return;
      }
      setXlsPreview(items as PdfExtractedItem[]);
    } catch {
      setXlsError('Impossible de lire le fichier. Vérifiez le format (CSV, XLS, XLSX).');
    }
  };

  const handleXlsImport = async () => {
    if (!xlsPreview.length) return;
    setXlsSaving(true);
    try {
      const { data: orderNumber, error: rpcError } = await supabase.rpc('generate_purchase_order_number');
      if (rpcError) throw rpcError;

      const totalHT = xlsPreview.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);

      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          created_by:   user?.id,
          status:       'draft',
          supplier_id:  xlsSupplierId || null,
          total_ht:     totalHT,
          notes:        'Importé depuis fichier CSV/XLS',
        })
        .select()
        .single();
      if (poErr) throw poErr;

      const itemsPayload = xlsPreview.map(item => ({
        purchase_order_id:   po.id,
        product_id:          null,
        supplier_product_id: item.ref || null,
        quantity:            item.quantity,
        unit_price_ht:       item.unit_price_ht,
        unit_price_ttc:      item.unit_price_ht * (1 + item.vat_rate / 100),
      }));
      const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      toast.success(`BdC ${orderNumber} créé avec ${xlsPreview.length} ligne(s)`);
      setShowXlsImport(false);
      setXlsPreview([]);
      setXlsSupplierId('');
      if (xlsInputRef.current) xlsInputRef.current.value = '';
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setXlsSaving(false);
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
    setPdfDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfParse = async () => {
    if (!pdfFile) return;
    setPdfStep('parsing');
    setPdfError('');
    setPdfParseProgress(10);

    try {
      const supplierName = suppliers.find((s) => s.id === pdfSupplierId)?.name || '';

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
        const detail = (errData.errors as string[] | undefined)?.join(' · ') || '';
        throw new Error(detail || errData.error || `HTTP ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Erreur inconnue');

      const result: PdfExtractResult = json.data;
      setPdfResult(result);
      setPdfParseProgress(100);

      // Auto-match items to products by EAN or supplier_reference
      const rawItems = result.items || [];
      const eansToMatch = rawItems.map(i => i.ean).filter(Boolean);
      const refsToMatch = rawItems.map(i => i.ref).filter(Boolean);

      const [byEanRes, byRefRes] = await Promise.all([
        eansToMatch.length > 0
          ? supabase.from('products').select('id, name, ean').in('ean', eansToMatch)
          : Promise.resolve({ data: [] }),
        refsToMatch.length > 0
          ? supabase.from('supplier_products')
              .select('product_id, supplier_reference, products(name)')
              .in('supplier_reference', refsToMatch)
          : Promise.resolve({ data: [] }),
      ]);

      const eanMap = new Map<string, { id: string; name: string }>(
        (byEanRes.data || []).map((p: any) => [p.ean, { id: p.id, name: p.name }])
      );
      const refMap = new Map<string, { id: string; name: string }>(
        (byRefRes.data || []).map((p: any) => [
          p.supplier_reference,
          { id: p.product_id, name: (p.products as any)?.name || '' },
        ])
      );

      const matchedItems: PdfExtractedItem[] = rawItems.map(item => {
        const byEan = item.ean ? eanMap.get(item.ean) : undefined;
        const byRef = item.ref ? refMap.get(item.ref) : undefined;
        const match = byEan || byRef;
        return {
          ...item,
          matched_product_id: match?.id ?? null,
          matched_product_name: match?.name ?? null,
        };
      });

      setPdfItems(matchedItems);
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
      const { data: orderNumber, error: rpcError } = await supabase.rpc('generate_purchase_order_number');
      if (rpcError) throw rpcError;

      const pdfTotalHT = pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);
      const pdfTotalTTC = pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht * (1 + (l.vat_rate || 20) / 100), 0);

      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          created_by: user?.id,
          status: 'draft',
          supplier_id: pdfSupplierId || null,
          total_ht: pdfTotalHT,
          total_ttc: pdfTotalTTC,
          notes: pdfResult?.order_number ? `Importé depuis PDF — BdC fournisseur : ${pdfResult.order_number}` : 'Importé depuis PDF',
          expected_delivery_date: null,
        })
        .select()
        .single();
      if (poErr) throw poErr;

      if (pdfItems.length > 0) {
        const itemsPayload = pdfItems.map((item) => ({
          purchase_order_id: po.id,
          product_id: item.matched_product_id || null,
          supplier_product_id: item.ref || null,
          quantity: item.quantity,
          unit_price_ht: item.unit_price_ht,
          unit_price_ttc: item.unit_price_ht * (1 + (item.vat_rate || 20) / 100),
        }));
        const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      const matchedCount = pdfItems.filter(i => i.matched_product_id).length;
      toast.success(
        `BdC ${orderNumber} créé avec ${pdfItems.length} ligne(s)` +
        (matchedCount > 0 ? ` — ${matchedCount} produit(s) identifié(s)` : '')
      );
      setShowPdfImport(false);
      resetPdfImport();
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setPdfSaving(false);
    }
  };

  // ─── Drag & Drop helpers ──────────────────────────────────────────────────
  const handleDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === 'application/pdf' || file?.name.endsWith('.pdf')) {
      setPdfFile(file);
      setPdfError('');
    } else {
      setPdfError('Seuls les fichiers PDF sont acceptés.');
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
            <Button variant="outline" onClick={() => { setXlsPreview([]); setXlsError(''); setShowXlsImport(true); }}>
              <FileUp className="mr-2 h-4 w-4" />
              Importer CSV/XLS
            </Button>
            <Button variant="outline" onClick={() => { resetPdfImport(); setShowPdfImport(true); }}>
              <FileUp className="mr-2 h-4 w-4" />
              Importer un PDF
            </Button>
            <Button onClick={() => setShowCreate(true)}>
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
                        <Button size="sm" onClick={() => openReceive(order)}>
                          <Package className="h-3.5 w-3.5 mr-1" />
                          Réceptionner
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEdit(order)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteOrder(order)}
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
                        <TableHead className="w-24 text-right">Qté</TableHead>
                        <TableHead className="w-28 text-right">PU HT (€)</TableHead>
                        <TableHead className="w-28 text-right">Sous-total</TableHead>
                        <TableHead className="w-24 text-right">Qté reçue</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editItems.map((line, idx) => (
                        <TableRow key={idx}>
                          {/* Produit — autocomplete */}
                          <TableCell className="min-w-[220px]">
                            <ProductAutocomplete
                              value={line._product ?? null}
                              onChange={(p) => handleProductSelect(idx, p)}
                            />
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
                          {/* Sous-total */}
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            {((line.quantity || 0) * (line.unit_price_ht || 0)).toFixed(2)} €
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

              {/* Totaux */}
              {editItems.length > 0 && (
                <div className="flex justify-end gap-6 pt-1 text-sm">
                  <span>
                    Total HT : <span className="font-semibold text-primary">{totalHT.toFixed(2)} €</span>
                  </span>
                  <span className="text-muted-foreground">
                    Total TTC (est.) : <span className="font-semibold">{totalTTC.toFixed(2)} €</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2">
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

      {/* ── Dialog : Import CSV/XLS ────────────────────────────────────────── */}
      <Dialog open={showXlsImport} onOpenChange={v => { if (!v && !xlsSaving) { setShowXlsImport(false); setXlsPreview([]); setXlsError(''); if (xlsInputRef.current) xlsInputRef.current.value = ''; } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              Importer un bon de commande CSV / XLS / XLSX
            </DialogTitle>
            <DialogDescription>
              Colonnes reconnues : <span className="font-mono text-xs">Référence</span>, <span className="font-mono text-xs">Désignation</span>, <span className="font-mono text-xs">Qté</span>, <span className="font-mono text-xs">PU HT</span>, <span className="font-mono text-xs">TVA%</span>, <span className="font-mono text-xs">EAN</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {xlsError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{xlsError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fournisseur</Label>
                <Select value={xlsSupplierId} onValueChange={setXlsSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner (facultatif)" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fichier</Label>
                <input
                  ref={xlsInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleXlsFileChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
              </div>
            </div>

            {xlsPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Aperçu — {xlsPreview.length} ligne(s) détectée(s) · Total HT : <span className="text-primary font-semibold">{xlsPreview.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0).toFixed(2)} €</span>
                </p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {xlsPreview.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.ref || '—'}</TableCell>
                          <TableCell className="text-sm">{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unit_price_ht.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.vat_rate}</TableCell>
                          <TableCell className="text-right font-medium">{(item.quantity * item.unit_price_ht).toFixed(2)} €</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {xlsPreview.length > 10 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">… et {xlsPreview.length - 10} ligne(s) supplémentaire(s)</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowXlsImport(false)} disabled={xlsSaving}>Annuler</Button>
            <Button onClick={handleXlsImport} disabled={xlsPreview.length === 0 || xlsSaving}>
              {xlsSaving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création…</>
                : <>Créer le bon de commande ({xlsPreview.length} ligne(s))</>
              }
            </Button>
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
                  className={[
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    pdfDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
                  ].join(' ')}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setPdfDragging(true); }}
                  onDragLeave={() => setPdfDragging(false)}
                  onDrop={handleDropzoneDrop}
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
              <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-md text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-foreground">
                    <strong>{pdfItems.length} ligne(s)</strong> extraite(s)
                    {pdfResult?.supplier_name && ` · Fournisseur détecté : ${pdfResult.supplier_name}`}
                    {pdfResult?.order_number && ` · Réf. fournisseur : ${pdfResult.order_number}`}
                  </span>
                  {pdfItems.filter(i => i.matched_product_id).length > 0 && (
                    <p className="text-xs text-green-700">
                      {pdfItems.filter(i => i.matched_product_id).length} produit(s) identifié(s) automatiquement dans votre catalogue
                    </p>
                  )}
                </div>
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
                        <TableHead className="w-32">Produit catalogue</TableHead>
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
                            {item.matched_product_id ? (
                              <span className="text-xs text-green-700 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[100px]" title={item.matched_product_name ?? ''}>
                                  {item.matched_product_name}
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Non trouvé</span>
                            )}
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
                          <TableCell className="text-right text-sm font-medium tabular-nums">
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

              {/* Totaux PDF */}
              {pdfItems.length > 0 && (
                <div className="flex justify-end gap-6 text-sm">
                  <span className="font-semibold">
                    Total HT : <span className="text-primary ml-1">
                      {pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0).toFixed(2)} €
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Total TTC (est.) : <span className="font-semibold">
                      {pdfItems.reduce((s, l) => s + l.quantity * l.unit_price_ht * (1 + (l.vat_rate || 20) / 100), 0).toFixed(2)} €
                    </span>
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

      {/* ── Dialog : Réception de marchandise ──────────────────────────────── */}
      <Dialog
        open={!!receivingOrder}
        onOpenChange={v => { if (!v && !receiving) setReceivingOrder(null); }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Réception — {receivingOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Choisissez le mode de réception et validez les quantités à ajouter au stock.
            </DialogDescription>
          </DialogHeader>

          {receiveLines.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Ce bon de commande n'a pas de lignes produits.
            </p>
          ) : (
            <div className="space-y-4 py-2">

              {/* Sélecteur de mode */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={receiveMode === 'global' ? 'default' : 'outline'}
                  onClick={() => {
                    setReceiveMode('global');
                    setReceiveLines(ls =>
                      ls.map(l => ({ ...l, received: l.expected, status: 'recu' as const }))
                    );
                  }}
                >
                  ✅ Tout recevoir
                </Button>
                <Button
                  size="sm"
                  variant={receiveMode === 'lines' ? 'default' : 'outline'}
                  onClick={() => setReceiveMode('lines')}
                >
                  📋 Ligne par ligne
                </Button>
              </div>

              {/* Mode global — résumé */}
              {receiveMode === 'global' && (
                <div className="rounded-md border p-4 bg-muted/30 text-sm space-y-1">
                  <p className="font-medium mb-2">
                    {receiveLines.length} ligne(s) ·{' '}
                    {receiveLines.reduce((s, l) => s + l.expected, 0)} unité(s) à mettre en stock
                  </p>
                  {receiveLines.map(l => (
                    <p key={l.po_item_id} className="text-muted-foreground">
                      {l.product_name} — <span className="font-medium text-foreground">{l.expected} unité(s)</span>
                      {!l.product_id && (
                        <span className="ml-2 text-xs text-yellow-600">(non lié à un produit catalogue)</span>
                      )}
                    </p>
                  ))}
                </div>
              )}

              {/* Mode ligne par ligne — tableau éditable */}
              {receiveMode === 'lines' && (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-24 text-right">Attendu</TableHead>
                        <TableHead className="w-28 text-right">Reçu</TableHead>
                        <TableHead className="w-36">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiveLines.map((line, idx) => (
                        <TableRow key={line.po_item_id}>
                          <TableCell className="font-medium text-sm">
                            {line.product_name}
                            {!line.product_id && (
                              <span className="ml-1 text-xs text-yellow-600">(non lié)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {line.expected}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={line.expected}
                              className="h-8 text-right"
                              value={line.received}
                              onChange={e => {
                                const v = Math.min(line.expected, Math.max(0, parseInt(e.target.value) || 0));
                                setReceiveLines(ls => ls.map((l, i) => i !== idx ? l : {
                                  ...l,
                                  received: v,
                                  status:   v === 0          ? 'non_livre'
                                          : v < l.expected   ? 'partiel'
                                          :                    'recu',
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={line.status}
                              onValueChange={v =>
                                setReceiveLines(ls => ls.map((l, i) => i !== idx ? l : {
                                  ...l,
                                  status:   v as ReceiveLine['status'],
                                  received: v === 'non_livre' ? 0
                                          : v === 'recu'      ? l.expected
                                          : l.received,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="recu">✅ Reçu complet</SelectItem>
                                <SelectItem value="partiel">🟡 Partiel</SelectItem>
                                <SelectItem value="non_livre">⚫ Non livré</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Barre de résumé */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-3">
                <span>Attendu : <b className="text-foreground">{receiveLines.reduce((s, l) => s + l.expected, 0)}</b></span>
                <span>Reçu : <b className="text-green-600">{receiveLines.reduce((s, l) => s + l.received, 0)}</b></span>
                <span>
                  Non livré : <b className="text-red-500">
                    {receiveLines.filter(l => l.status === 'non_livre').length} ligne(s)
                  </b>
                </span>
              </div>

            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReceivingOrder(null)} disabled={receiving}>
              Annuler
            </Button>
            <Button
              onClick={handleReceive}
              disabled={receiving || receiveLines.length === 0 || receiveLines.every(l => l.received === 0)}
            >
              {receiving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
              ) : (
                <>Valider la réception ({receiveLines.reduce((s, l) => s + l.received, 0)} unité(s))</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
