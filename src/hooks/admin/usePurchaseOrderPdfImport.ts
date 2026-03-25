import type { PdfExtractedItem, PdfExtractResult } from '@/components/admin/purchases/types';
import type { PurchaseOrderState } from './usePurchaseOrderState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toastError } from './helpers/toastError';
import { resolveSupplierProductIds } from './helpers/resolveSupplierProductIds';

const PROGRESS_INTERVAL_MS = 800;
const PROGRESS_INCREMENT = 8;
const PROGRESS_MAX_PASSIVE = 85;

interface Deps {
  state: PurchaseOrderState;
  userId: string | undefined;
  fetchData: () => Promise<void>;
}

export function usePurchaseOrderPdfImport({ state, userId, fetchData }: Deps) {
  const {
    suppliers,
    pdfSupplierId, setPdfSupplierId, pdfFile, setPdfFile,
    setPdfStep, pdfResult, setPdfResult, pdfItems, setPdfItems,
    setPdfError, setPdfSaving, setPdfParseProgress, setPdfDragging,
    setShowPdfImport, fileInputRef,
  } = state;

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
        setPdfParseProgress((p) => Math.min(p + PROGRESS_INCREMENT, PROGRESS_MAX_PASSIVE));
      }, PROGRESS_INTERVAL_MS);

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
        const errData = await response.json().catch(() => ({ error: 'Erreur rÃ©seau' }));
        const detail = (errData.errors as string[] | undefined)?.join(' Â· ') || '';
        throw new Error(detail || errData.error || `HTTP ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Erreur inconnue');

      const result: PdfExtractResult = json.data;
      setPdfResult(result);
      setPdfParseProgress(100);

      // ââ Matching produits par EAN et ref fournisseur âââââââââââââââââââââââ
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
        pdfSupplierId || null,
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
          notes: pdfResult?.order_number ? `ImportÃ© depuis PDF â BdC fournisseur : ${pdfResult.order_number}` : 'ImportÃ© depuis PDF',
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
        `BdC ${orderNumber} crÃ©Ã© avec ${pdfItems.length} ligne(s)` +
        (matchedCount > 0 ? ` â ${matchedCount} produit(s) identifiÃ©(s)` : '')
      );
      setShowPdfImport(false);
      resetPdfImport();
      fetchData();
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setPdfSaving(false);
    }
  };

  const handleDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === 'application/pdf' || file?.name.endsWith('.pdf')) {
      setPdfFile(file);
      setPdfError('');
    } else {
      setPdfError('Seuls les fichiers PDF sont acceptÃ©s.');
    }
  };

  return {
    resetPdfImport,
    handlePdfParse,
    patchPdfItem,
    removePdfItem,
    handlePdfConfirm,
    handleDropzoneDrop,
  };
}
