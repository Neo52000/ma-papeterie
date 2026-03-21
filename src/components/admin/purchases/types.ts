import type { ProductMatch } from '@/components/admin/ProductAutocomplete';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
}

export interface PurchaseOrder {
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

export interface OrderItem {
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
export interface PdfExtractedItem {
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

export interface PdfExtractResult {
  order_number: string | null;
  order_date: string | null;
  supplier_name: string | null;
  total_ht: number | null;
  items: PdfExtractedItem[];
}

export type PdfImportStep = 'select' | 'parsing' | 'review' | 'saving';

export interface ReceiveLine {
  po_item_id:   string;
  product_id:   string | null;
  product_name: string;
  expected:     number;   // reliquat à recevoir
  received:     number;
  status:       'recu' | 'partiel' | 'non_livre';
}

// ─── Status helpers ───────────────────────────────────────────────────────────
export const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:              { label: 'Brouillon',            variant: 'outline' },
  sent:               { label: 'Envoyé',               variant: 'secondary' },
  confirmed:          { label: 'Confirmé',             variant: 'default' },
  partially_received: { label: 'Partiellement reçu',  variant: 'secondary' },
  received:           { label: 'Reçu',                 variant: 'default' },
  cancelled:          { label: 'Annulé',               variant: 'destructive' },
};

export const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([value, { label }]) => ({ value, label }));
