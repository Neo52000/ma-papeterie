export type PrintFormat = 'A4' | 'A3';
export type PrintColor = 'nb' | 'couleur';

export interface PrintPriceEntry {
  format: PrintFormat;
  color: PrintColor;
  price_per_page: number;
}

/** Fallback prices used when Supabase is unreachable */
export const DEFAULT_PRICES: PrintPriceEntry[] = [
  { format: 'A4', color: 'nb', price_per_page: 0.10 },
  { format: 'A4', color: 'couleur', price_per_page: 0.50 },
  { format: 'A3', color: 'nb', price_per_page: 0.20 },
  { format: 'A3', color: 'couleur', price_per_page: 1.00 },
];

export function getUnitPrice(
  prices: PrintPriceEntry[],
  format: PrintFormat,
  color: PrintColor,
): number {
  const entry = prices.find(p => p.format === format && p.color === color);
  return entry?.price_per_page ?? 0;
}

export function calculateTotal(
  unitPrice: number,
  copies: number,
  rectoVerso: boolean,
): number {
  const pages = rectoVerso ? 2 : 1;
  let total = unitPrice * pages * copies;
  // Discount for recto-verso: -10%
  if (rectoVerso) {
    total *= 0.9;
  }
  // Volume discounts
  if (copies >= 100) {
    total *= 0.8;
  } else if (copies >= 50) {
    total *= 0.9;
  }
  return Math.round(total * 100) / 100;
}

export const FORMAT_LABELS: Record<PrintFormat, string> = {
  A4: 'A4',
  A3: 'A3',
};

export const COLOR_LABELS: Record<PrintColor, string> = {
  nb: 'Noir & blanc',
  couleur: 'Couleur',
};
