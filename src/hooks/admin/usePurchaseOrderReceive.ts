import type { PurchaseOrder, ReceiveLine } from '@/components/admin/purchases/types';
import type { PurchaseOrderState } from './usePurchaseOrderState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toastError } from './helpers/toastError';

const RECEPTION_STATUS_NOTES: Record<ReceiveLine['status'], string> = {
  recu:      'â ReÃ§u',
  partiel:   'ð¡ Partiel',
  non_livre: 'â« Non livrÃ©',
};

interface Deps {
  state: PurchaseOrderState;
  userId: string | undefined;
  fetchData: () => Promise<void>;
}

export function usePurchaseOrderReceive({ state, userId, fetchData }: Deps) {
  const {
    receivingOrder, setReceivingOrder, receiveLines, setReceiveLines,
    setReceiveMode, setReceiving,
  } = state;

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
      // ââ Mise Ã  jour stock produits (batch-friendly) âââââââââââââââââââââââââ
      const linesToProcess = receiveLines.filter(l => l.received > 0 && l.product_id);
      const productIds = linesToProcess.map(l => l.product_id!);

      // RÃ©cupÃ©rer tous les stocks en un seul appel au lieu de N+1
      const { data: products } = productIds.length > 0
        ? await supabase.from('products').select('id, stock_quantity').in('id', productIds)
        : { data: [] };

      const stockMap = new Map((products || []).map(p => [p.id, p.stock_quantity || 0]));

      for (const line of linesToProcess) {
        const currentStock = stockMap.get(line.product_id!) ?? 0;
        await supabase.from('products')
          .update({ stock_quantity: currentStock + line.received })
          .eq('id', line.product_id!);
      }

      // ââ Mise Ã  jour received_quantity sur les lignes BdC ââââââââââââââââââââ
      const poItemIds = receiveLines.filter(l => l.received > 0).map(l => l.po_item_id);
      const { data: poItems } = poItemIds.length > 0
        ? await supabase.from('purchase_order_items').select('id, received_quantity').in('id', poItemIds)
        : { data: [] };

      const receivedMap = new Map((poItems || []).map(p => [p.id, p.received_quantity ?? 0]));

      for (const line of receiveLines) {
        if (line.received === 0) continue;
        const current = receivedMap.get(line.po_item_id) ?? 0;
        await supabase.from('purchase_order_items')
          .update({ received_quantity: current + line.received })
          .eq('id', line.po_item_id);
      }

      // ââ CrÃ©er la rÃ©ception ââââââââââââââââââââââââââââââââââââââââââââââââââ
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
            notes:                  RECEPTION_STATUS_NOTES[l.status] ?? '',
          }))
        );
      }

      const newStatus = totalRecv >= totalExp ? 'received' : 'partially_received';
      await supabase.from('purchase_orders')
        .update({ status: newStatus }).eq('id', receivingOrder.id);

      toast.success(`RÃ©ception ${recNum} â ${totalRecv} unitÃ©(s) ajoutÃ©e(s) au stock`);
      setReceivingOrder(null);
      fetchData();
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setReceiving(false);
    }
  };

  return { openReceive, handleReceive };
}
