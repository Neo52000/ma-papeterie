import type { ProductMatch } from '@/components/admin/ProductAutocomplete';
import type { PurchaseOrder, OrderItem } from '@/components/admin/purchases/types';
import type { PurchaseOrderState } from './usePurchaseOrderState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toastError } from './helpers/toastError';

interface Deps {
  state: PurchaseOrderState;
  userId: string | undefined;
}

export function usePurchaseOrderCrud({ state, userId }: Deps) {
  const {
    setPurchaseOrders, setSuppliers, setLoading,
    createForm, setCreateForm, setCreating, setShowCreate,
    editOrder, setEditOrder, editItems, setEditItems, editHeader, setEditHeader,
    setSaving, setDeleting,
  } = state;

  // âââ Data fetching ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
      toast.error('Erreur lors du chargement des donnÃ©es');
    } finally {
      setLoading(false);
    }
  };

  // âââ Create âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

      toast.success('Bon de commande crÃ©Ã©');
      setShowCreate(false);
      setCreateForm({ supplier_id: '', expected_delivery_date: '', notes: '' });
      fetchData();
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setCreating(false);
    }
  };

  // âââ Open edit dialog âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
        ? {
            id: row.product_id,
            name: (row.products as Record<string, unknown>).name as string,
            sku_interne: (row.products as Record<string, unknown>).sku_interne as string,
            ean: (row.products as Record<string, unknown>).ean as string,
            cost_price: (row.products as Record<string, unknown>).cost_price as number,
          }
        : null,
    }));
    setEditItems(items);
  };

  // âââ Edit items helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // âââ Totals âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const totalHT = editItems.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price_ht || 0), 0);
  const totalTTC = editItems.reduce((s, l) => {
    const ht = (l.quantity || 0) * (l.unit_price_ht || 0);
    return s + (l.unit_price_ttc != null ? (l.quantity || 0) * l.unit_price_ttc : ht * 1.2);
  }, 0);

  // âââ Save (batch upsert) âââââââââââââââââââââââââââââââââââââââââââââââââââ
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

      toast.success('Bon de commande enregistrÃ©');
      setEditOrder(null);
      fetchData();
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  // âââ Delete âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const handleDelete = async () => {
    if (!editOrder) return;
    if (!confirm(`Supprimer dÃ©finitivement ${editOrder.order_number} ?`)) return;
    setDeleting(true);
    try {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', editOrder.id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', editOrder.id);
      if (error) throw error;
      toast.success('Bon de commande supprimÃ©');
      setEditOrder(null);
      fetchData();
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOrder = async (order: PurchaseOrder) => {
    if (!confirm(`Supprimer dÃ©finitivement ${order.order_number} ?\nCette action est irrÃ©versible.`)) return;
    try {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', order.id);
      const { error } = await supabase.from('purchase_orders').delete().eq('id', order.id);
      if (error) throw error;
      toast.success('Bon de commande supprimÃ©');
      fetchData();
    } catch (err: unknown) {
      toastError(err);
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
  };
}
