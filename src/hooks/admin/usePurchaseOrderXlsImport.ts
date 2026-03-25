import type { PdfExtractedItem } from '@/components/admin/purchases/types';
import type { PurchaseOrderState } from './usePurchaseOrderState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toastError } from './helpers/toastError';
import { resolveSupplierProductIds } from './helpers/resolveSupplierProductIds';

interface Deps {
  state: PurchaseOrderState;
  userId: string | undefined;
  fetchData: () => Promise<void>;
}

export function usePurchaseOrderXlsImport({ state, userId, fetchData }: Deps) {
  const {
    xlsSupplierId, setXlsSupplierId, xlsPreview, setXlsPreview,
    setXlsSaving, setXlsError, setShowXlsImport, xlsInputRef,
  } = state;

  const handleXlsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsError('');
    try {
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
          ref:           find(row, 'rÃ©fÃ©rence', 'reference', 'ref', 'sku', 'code article', 'codearticle'),
          name:          find(row, 'description', 'dÃ©signation', 'designation', 'libellÃ©', 'libelle', 'name', 'nom', 'produit', 'article'),
          quantity:      parseFloat(String(find(row, 'quantitÃ©', 'quantite', 'qty', 'qtÃ©', 'qte', 'quantity') || '1').replace(',', '.')) || 1,
          unit_price_ht: parseFloat(String(find(row, 'prix unitaire', 'pu ht', 'pu_ht', 'puht', 'prix', 'price', 'coÃ»t', 'cout') || '0').replace(',', '.')) || 0,
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
        setXlsError('Aucune ligne dÃ©tectÃ©e. Colonnes attendues : "Description" (ou "DÃ©signation"), "QuantitÃ©", "Prix".');
        return;
      }
      setXlsPreview(items as PdfExtractedItem[]);
    } catch {
      setXlsError('Impossible de lire le fichier. VÃ©rifiez le format (CSV, XLS, XLSX).');
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
          notes:        'ImportÃ© depuis fichier CSV/XLS',
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

      toast.success(`BdC ${orderNumber} crÃ©Ã© avec ${xlsPreview.length} ligne(s)`);
      setShowXlsImport(false);
      setXlsPreview([]);
      setXlsSupplierId('');
      if (xlsInputRef.current) xlsInputRef.current.value = '';
      fetchData();
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setXlsSaving(false);
    }
  };

  return { handleXlsFileChange, handleXlsImport };
}
