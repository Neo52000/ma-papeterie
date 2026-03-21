import { useState, useRef } from 'react';
import type {
  PurchaseOrder,
  Supplier,
  OrderItem,
  PdfExtractedItem,
  PdfExtractResult,
  PdfImportStep,
  ReceiveLine,
} from '@/components/admin/purchases/types';

export interface CreateForm {
  supplier_id: string;
  expected_delivery_date: string;
  notes: string;
}

export interface EditHeader {
  supplier_id: string;
  status: string;
  expected_delivery_date: string;
  notes: string;
}

export function usePurchaseOrderState() {
  // ─── Core data ─────────────────────────────────────────────────────────────
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Search & filter ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ─── Create dialog ─────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    supplier_id: '',
    expected_delivery_date: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  // ─── Edit dialog ───────────────────────────────────────────────────────────
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editHeader, setEditHeader] = useState<EditHeader>({
    supplier_id: '',
    status: 'draft',
    expected_delivery_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── PDF import dialog ─────────────────────────────────────────────────────
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xlsInputRef = useRef<HTMLInputElement>(null);

  // ─── XLS/CSV import dialog ─────────────────────────────────────────────────
  const [showXlsImport, setShowXlsImport] = useState(false);
  const [xlsSupplierId, setXlsSupplierId] = useState('');
  const [xlsPreview, setXlsPreview] = useState<PdfExtractedItem[]>([]);
  const [xlsSaving, setXlsSaving] = useState(false);
  const [xlsError, setXlsError] = useState('');

  // ─── Reception dialog ──────────────────────────────────────────────────────
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveMode, setReceiveMode] = useState<'global' | 'lines'>('global');
  const [receiveLines, setReceiveLines] = useState<ReceiveLine[]>([]);
  const [receiving, setReceiving] = useState(false);

  return {
    // Core data
    purchaseOrders, setPurchaseOrders,
    suppliers, setSuppliers,
    loading, setLoading,

    // Search & filter
    searchQuery, setSearchQuery,
    filterStatus, setFilterStatus,

    // Create dialog
    showCreate, setShowCreate,
    createForm, setCreateForm,
    creating, setCreating,

    // Edit dialog
    editOrder, setEditOrder,
    editItems, setEditItems,
    editHeader, setEditHeader,
    saving, setSaving,
    deleting, setDeleting,

    // PDF import dialog
    showPdfImport, setShowPdfImport,
    pdfStep, setPdfStep,
    pdfSupplierId, setPdfSupplierId,
    pdfFile, setPdfFile,
    pdfResult, setPdfResult,
    pdfItems, setPdfItems,
    pdfError, setPdfError,
    pdfSaving, setPdfSaving,
    pdfParseProgress, setPdfParseProgress,
    pdfDragging, setPdfDragging,
    fileInputRef,
    xlsInputRef,

    // XLS/CSV import dialog
    showXlsImport, setShowXlsImport,
    xlsSupplierId, setXlsSupplierId,
    xlsPreview, setXlsPreview,
    xlsSaving, setXlsSaving,
    xlsError, setXlsError,

    // Reception dialog
    receivingOrder, setReceivingOrder,
    receiveMode, setReceiveMode,
    receiveLines, setReceiveLines,
    receiving, setReceiving,
  };
}

export type PurchaseOrderState = ReturnType<typeof usePurchaseOrderState>;
