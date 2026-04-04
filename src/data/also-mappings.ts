// ALSO PACO pricelist — positional column definitions (no header row)
// File format: semicolon-delimited, 16 columns, no header line.
// Source: pricelist-1.txt.zip from paco.also.com

export interface AlsoPricelistRow {
  article_number: string;   // col 0  — ALSO article number
  manufacturer_ref: string; // col 1  — Manufacturer part number (MPN)
  manufacturer: string;     // col 2  — Brand / manufacturer name
  ean: string;              // col 3  — EAN barcode
  description: string;      // col 4  — Product description
  stock: string;            // col 5  — Stock quantity (our allocation)
  price: string;            // col 6  — Purchase price HT (€)
  rrp_ht: string;            // col 7  — Prix Public Indicatif HT (€)
  category_1: string;       // col 8  — Category level 1
  category_2: string;       // col 9  — Category level 2
  category_3: string;       // col 10 — Category level 3 (product group)
  deee_flag: string;        // col 11 — DEEE flag (empty or "X")
  weight: string;           // col 12 — Weight in kg
  available_stock: string;  // col 13 — Available stock / total warehouse
  tva_rate: string;         // col 14 — VAT rate (%)
  tva_amount: string;       // col 15 — VAT amount (€)
}

export const ALSO_COLUMNS: (keyof AlsoPricelistRow)[] = [
  'article_number',
  'manufacturer_ref',
  'manufacturer',
  'ean',
  'description',
  'stock',
  'price',
  'rrp_ht',
  'category_1',
  'category_2',
  'category_3',
  'deee_flag',
  'weight',
  'available_stock',
  'tva_rate',
  'tva_amount',
];
