/**
 * AgrÃ©gateur rÃ©trocompatible â compose les 4 hooks spÃ©cialisÃ©s.
 * L'interface de retour est identique Ã  l'ancienne version monolithique :
 * AdminPurchases.tsx n'a besoin d'aucune modification.
 */
import type { PurchaseOrderState } from './usePurchaseOrderState';
import { usePurchaseOrderCrud } from './usePurchaseOrderCrud';
import { usePurchaseOrderReceive } from './usePurchaseOrderReceive';
import { usePurchaseOrderXlsImport } from './usePurchaseOrderXlsImport';
import { usePurchaseOrderPdfImport } from './usePurchaseOrderPdfImport';

interface Deps {
  state: PurchaseOrderState;
  userId: string | undefined;
}

export function usePurchaseOrderHandlers({ state, userId }: Deps) {
  const crud = usePurchaseOrderCrud({ state, userId });
  const receive = usePurchaseOrderReceive({ state, userId, fetchData: crud.fetchData });
  const xls = usePurchaseOrderXlsImport({ state, userId, fetchData: crud.fetchData });
  const pdf = usePurchaseOrderPdfImport({ state, userId, fetchData: crud.fetchData });

  return {
    // CRUD
    fetchData: crud.fetchData,
    handleCreate: crud.handleCreate,
    openEdit: crud.openEdit,
    addLine: crud.addLine,
    removeLine: crud.removeLine,
    patchLine: crud.patchLine,
    handleProductSelect: crud.handleProductSelect,
    totalHT: crud.totalHT,
    totalTTC: crud.totalTTC,
    handleSave: crud.handleSave,
    handleDelete: crud.handleDelete,
    handleDeleteOrder: crud.handleDeleteOrder,
    // Reception
    openReceive: receive.openReceive,
    handleReceive: receive.handleReceive,
    // XLS/CSV Import
    handleXlsFileChange: xls.handleXlsFileChange,
    handleXlsImport: xls.handleXlsImport,
    // PDF Import
    resetPdfImport: pdf.resetPdfImport,
    handlePdfParse: pdf.handlePdfParse,
    patchPdfItem: pdf.patchPdfItem,
    removePdfItem: pdf.removePdfItem,
    handlePdfConfirm: pdf.handlePdfConfirm,
    handleDropzoneDrop: pdf.handleDropzoneDrop,
  };
}
