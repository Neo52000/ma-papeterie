export interface Supplier {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  siret: string | null;
  vat_number: string | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  minimum_order_amount: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupplierCode = 'ALKOR' | 'COMLANDI' | 'SOFT';

export interface SupplierOffer {
  id: string;
  product_id: string;
  supplier: SupplierCode;
  supplier_product_id: string;
  pvp_ttc: number | null;
  purchase_price_ht: number | null;
  vat_rate: number | null;
  tax_breakdown: Record<string, number> | null;
  stock_qty: number;
  delivery_delay_days: number | null;
  min_qty: number;
  packaging: Record<string, unknown> | null;
  is_active: boolean;
  last_seen_at: string;
  updated_at: string;
  created_at: string;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_reference: string | null;
  supplier_price: number | null;
  stock_quantity: number | null;
  lead_time_days: number | null;
  is_preferred: boolean;
  priority_rank: number | null;
  min_order_quantity: number | null;
  source_type: string | null;
}
