// ── Supplier Types & Constants ───────────────────────────────────────────────
// Centralised definitions for the supplier module.

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

export const SUPPLIER_CODES: SupplierCode[] = ['ALKOR', 'COMLANDI', 'SOFT'];

// ── Supplier name aliases → canonical code ──────────────────────────────────

const SUPPLIER_ALIASES: Record<string, SupplierCode> = {
  ALKOR: 'ALKOR',
  BUROLIKE: 'ALKOR',
  COMLANDI: 'COMLANDI',
  'CS GROUP': 'COMLANDI',
  LIDERPAPEL: 'COMLANDI',
  SOFT: 'SOFT',
  SOFTCARRIER: 'SOFT',
  'SOFT CARRIER': 'SOFT',
};

/**
 * Resolve a free-text supplier name to a canonical SupplierCode.
 * Returns null when the name cannot be matched.
 */
export function resolveSupplierCode(name: string): SupplierCode | null {
  const upper = name.toUpperCase();
  for (const [alias, code] of Object.entries(SUPPLIER_ALIASES)) {
    if (upper.includes(alias)) return code;
  }
  return null;
}

// ── Priority (lower = higher priority) ──────────────────────────────────────

const SUPPLIER_CODE_PRIORITY: Record<SupplierCode, number> = {
  ALKOR: 1,
  COMLANDI: 2,
  SOFT: 3,
};

export function getSupplierPriority(name: string): number {
  const code = resolveSupplierCode(name);
  return code ? SUPPLIER_CODE_PRIORITY[code] : 4;
}

// ── UI colours ──────────────────────────────────────────────────────────────

export const SUPPLIER_BADGE_COLORS: Record<SupplierCode, string> = {
  ALKOR: 'border-green-300 bg-green-100 text-green-800',
  COMLANDI: 'border-blue-300 bg-blue-100 text-blue-800',
  SOFT: 'border-purple-300 bg-purple-100 text-purple-800',
};

export const SUPPLIER_HEADER_BG: Record<SupplierCode, string> = {
  ALKOR: 'bg-green-50/50',
  COMLANDI: 'bg-blue-50/50',
  SOFT: 'bg-purple-50/50',
};

// ── Shared interfaces ───────────────────────────────────────────────────────

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

// ── Unified catalog item (maps to v_product_all_offers view) ────────────────

export interface CatalogItem {
  offer_id: string;
  product_id: string;
  product_name: string;
  ean: string | null;
  image_url: string | null;
  sku_interne: string | null;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string | null;
  supplier_sku: string | null;
  supplier_product_name: string | null;
  purchase_price_ht: number | null;
  pvp_ttc: number | null;
  vat_rate: number | null;
  stock_qty: number;
  delivery_delay_days: number | null;
  min_order_qty: number;
  is_active: boolean;
  is_preferred: boolean;
  priority_rank: number | null;
  source_type: string;
  last_seen_at: string;
}

// ── Best offer (maps to v_best_offers view) ─────────────────────────────────

export interface BestOffer {
  product_id: string;
  offer_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string | null;
  supplier_sku: string | null;
  purchase_price_ht: number | null;
  pvp_ttc: number | null;
  stock_qty: number;
  delivery_delay_days: number | null;
  min_order_qty: number;
  is_preferred: boolean;
  last_seen_at: string;
}
