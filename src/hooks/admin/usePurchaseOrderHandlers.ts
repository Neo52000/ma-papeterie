import type { ProductMatch } from '@/components/admin/ProductAutocomplete';
import type {
  PurchaseOrder,
  OrderItem,
  PdfExtractedItem,
  PdfExtractResult,
  ReceiveLine,
} from '@/components/admin/purchases/types';
import type { PurchaseOrderState } from './usePurchaseOrderState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Deps {
  state: PurchaseOrderState;
  userId: string | undefined;
}

export function usePurchaseOrderHandlers({ state, userId }: Deps) {
  const {
    setPurchaseOrders, setSuppliers, setLoading,
    createForm, setCreateForm, setCreating, setShowCreate,
    editOrder, setEditOrder, editItems, setEditItems, editHeader, setEditHeader,
    setSaving, setDeleting,
    suppliers,
    pdfSupplierId, setPdfSupplierId, pdfFile, setPdfFile,
    setPdfStep, setPdfResult, pdfItems, setPdfItems,
    setPdfError, setPdfSaving, setPdfParseProgress, setPdfDragging,
    pdfResult,
    fileInputRef, xlsInputRef,
    xlsSupplierId, setXlsSupplierId, xlsPreview, setXlsPreview,
    setXlsSaving, setXlsError,
    setShowXlsImport,
    setShowPdfImport,
    receivingOrder, setReceivingOrder, receiveLines, setReceiveLines,
    setReceiveMode, setReceiving,
  } = state;

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
    } catch (_error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ─── Create BdC ───────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data: orderNumber, error: rpcError } = await supabase.rpc('generate_purchase_order_number');
      if (rpcError) throw rpcError;

      const { error: insertError } = await supabase.from('purchase_orders').insert({
        order_number: orderNumber,
        created_by: userId,
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
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnue'}`);
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

    const items: OrderItem[] = (data || []).map((row) => ({
      id: row.id,
      product_id: row.product_id,
      supplier_product_id: row.supplier_product_id,
      quantity: row.quantity,
      unit_price_ht: row.unit_price_ht,
      unit_price_ttc: row.unit_price_ttc,
      received_quantity: row.received_quantity,
      _product: row.products
        ? { id: row.product_id, name: (row.products as Record<string, unknown>).name as string, sku_interne: (row.products as Record<string, unknown>).sku_interne as string, ean: (row.products as Record<string, unknown>).ean as string, cost_price: (row.products as Record<string, unknown>).cost_price as number }
        : null,
    }));
    setEditItems(items);
  };

  // ─── Edit items helpers ───────────────────────────────────────────────────
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

      const { data: existingRows } = await supabase
        .from('purchase_order_items')
        .select('id')
        .eq('purchase_order_id', editOrder.id);

      const keptIds = new Set(editItems.filter((l) => l.id).map((l) => l.id));
      const toDelete = (existingRows || []).filter((r) => !keptIds.has(r.id)).map((r) => r.id);
      if (toDelete.length > 0) {
        await supabase.from('purchase_order_items').delete().in('id', toDelete);
      }

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
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete BdC ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editOrder) return;
    // TODO: Migrate to <AlertDialog> for accessibility
    if (!confirm(`Supprimer définitivement ${editOrder.order_number} ?`)) return;
    setDeleting(true);
    try {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', editOrder.id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', editOrder.id);
      if (error) throw error;
      toast.success('Bon de commande supprimé');
      setEditOrder(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnue'}`);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Delete BdC (depuis la liste) ─────────────────────────────────────────
  const handleDeleteOrder = async (order: PurchaseOrder) => {
    // TODO: Migrate to <AlertDialog> for accessibility
    if (!confirm(`Supprimer définitivement ${order.order_number} ?\nCette action est irréversible.`)) return;
    try {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', order.id);
      if (error) throw error;
      toast.success('Bon de commande supprimé');
      fetchData();
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnue'}`);
    }
  };

  // ─── Reception ────────────────────────────────────────────────────────────
  const openReceive = async (order: PurchaseOrder) => {
    const { data: items, error } = await supabase
      .from('purchase_order_items')
      .select('id, product_id, supplier_product_id, quantity, received_quantity, products(name)')
      .eq('purchase_order_id', order.id);

    if (error) { toast.error('Erreur chargement des lignes'); return; }

    const lines: ReceiveLine[] = (items ?? []).map((item) => {
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

      for (const line of linesToProcess) {
        const { data: prod } = await supabase
          .from('products').select('stock_quantity').eq('id', line.product_id!).single();
        if (prod) {
          await supabase.from('products')
            .update({ stock_quantity: (prod.stock_quantity || 0) + line.received })
            .eq('id', line.product_id!);
        }
      }

      for (const line of receiveLines) {
        if (line.received === 0) continue;
        const { data: poi } = await supabase
          .from('purchase_order_items').select('received_quantity').eq('id', line.po_item_id).single();
        await supabase.from('purchase_order_items')
          .update({ received_quantity: (poi?.received_quantity ?? 0) + line.received })
          .eq('id', line.po_item_id);
      }

      const recNum = `REC-${new Date().getFullYear()}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
      const totalRecv = receiveLines.reduce((s, l) => s + l.received, 0);
      const totalExp  = receiveLines.reduce((s, l) => s + l.expected, 0);

      const { data: rec } = await supabase.from('stock_receptions').insert({
        purchase_order_id: receivingOrder.id,
        reception_number:  recNum,
        reception_date:    new Date().toISOString(),
        status:            totalRecv >= totalExp ? 'completed' : 'partial',
        received_by:       userId!,
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

      const newStatus = totalRecv >= totalExp ? 'received' : 'partially_received';
      await supabase.from('purchase_orders')
        .update({ status: newStatus }).eq('id', receivingOrder.id);

      toast.success(`Réception ${recNum} — ${totalRecv} unité(s) ajoutée(s) au stock`);
      setReceivingOrder(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnue'}`);
    } finally {
      setReceiving(false);
    }
  };

  // ─── Resolve supplier refs → supplier_products.id UUIDs ───────────────────
  const resolveSupplierProductIds = async (
    refs: string[],
    supplierId: string | null
  ): Promise<Map<string, string>> => {
    const refToId = new Map<string, string>();
    const uniqueRefs = [...new Set(refs.filter(Boolean))];
    if (uniqueRefs.length === 0 || !supplierId) return refToId;
    const CHUNK = 200;
    for (let i = 0; i < uniqueRefs.length; i += CHUNK) {
      const chunk = uniqueRefs.slice(i, i + CHUNK);
      const { data } = await supabase
        .from('supplier_products')
        .select('id, supplier_reference')
        .eq('supplier_id', supplierId)
        .in('supplier_reference', chunk);
      for (const sp of data || []) {
        if (sp.supplier_reference) refToId.set(sp.supplier_reference, sp.id);
      }
    }
    return refToId;
  };

  // ─── XLS/CSV Import logic ─────────────────────────────────────────────────
  const handleXlsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsError('');
    try {
      const { readExcel: _readExcel } = await import('@/lib/excel');

      const buffer = await file.arrayBuffer();
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

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

      const sheetToObjects = (ws: import('exceljs').Worksheet): Record<string, string>[] => {
        const headers: string[] = [];
        const firstRow = ws.getRow(1);
        firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber - 1] = cell.text?.trim() || `Column${colNumber}`;
        });
        const rows: Record<string, string>[] = [];
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const cell = row.getCell(idx + 1);
            obj[h] = cell.text?.trim() ?? '';
          });
          rows.push(obj);
        });
        return rows;
      };

      let items: ReturnType<typeof parseRows> = [];
      for (const ws of workbook.worksheets) {
        const rows = sheetToObjects(ws);
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

      const xlsTotalHT = xlsPreview.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);

      const refToSpId = await resolveSupplierProductIds(
        xlsPreview.map(item => item.ref),
        xlsSupplierId || null
      );

      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          created_by:   userId,
          status:       'draft',
          supplier_id:  xlsSupplierId || null,
          total_ht:     xlsTotalHT,
          notes:        'Importé depuis fichier CSV/XLS',
        })
        .select()
        .single();
      if (poErr) throw poErr;

      const itemsPayload = xlsPreview.map(item => ({
        purchase_order_id:   po.id,
        product_id:          null as string | null,
        supplier_product_id: refToSpId.get(item.ref) || null,
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
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnue'}`);
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
        (byEanRes.data || []).map((p) => [p.ean, { id: p.id, name: p.name }])
      );
      const refMap = new Map<string, { id: string; name: string }>(
        (byRefRes.data || []).map((p) => [
          p.supplier_reference,
          { id: p.product_id, name: (p.products as { name: string } | null)?.name || '' },
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
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : 'Erreur inconnue');
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

      const refToSpId = await resolveSupplierProductIds(
        pdfItems.map(item => item.ref),
        pdfSupplierId || null
      );
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          created_by: userId,
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
          product_id: null as string | null,
          supplier_product_id: refToSpId.get(item.ref) || null,
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
    } catch (err: unknown) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : 'Inconnue'}`);
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

  return {
    fetchData,
    handleCreate,
    openEdit,
    addLine,
    removeLine,
    patchLine,
    handleProductSelect,
    totalHT,
    totalTTC,
    handleSave,
    handleDelete,
    handleDeleteOrder,
    openReceive,
    handleReceive,
    handleXlsFileChange,
    handleXlsImport,
    resetPdfImport,
    handlePdfParse,
    patchPdfItem,
    removePdfItem,
    handlePdfConfirm,
    handleDropzoneDrop,
  };
}
