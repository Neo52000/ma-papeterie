export type PrintFormat = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
export type PrintColor = 'nb' | 'couleur';
export type PrintFinishing = 'none' | 'stapling' | 'spiral' | 'thermal' | 'lamination';
export type PaperWeight = 80 | 100 | 120 | 160;

export interface PrintPriceEntry {
  format: PrintFormat;
  color: PrintColor;
  price_per_page: number;
}

export interface FinishingPriceEntry {
  finishing: PrintFinishing;
  label: string;
  price: number;
  per_page: boolean;
}

/** Fallback prices used when Supabase is unreachable */
export const DEFAULT_PRICES: PrintPriceEntry[] = [
  { format: 'A4', color: 'nb', price_per_page: 0.10 },
  { format: 'A4', color: 'couleur', price_per_page: 0.50 },
  { format: 'A3', color: 'nb', price_per_page: 0.20 },
  { format: 'A3', color: 'couleur', price_per_page: 1.00 },
  { format: 'A2', color: 'nb', price_per_page: 1.50 },
  { format: 'A2', color: 'couleur', price_per_page: 3.00 },
  { format: 'A1', color: 'nb', price_per_page: 3.00 },
  { format: 'A1', color: 'couleur', price_per_page: 6.00 },
  { format: 'A0', color: 'nb', price_per_page: 5.00 },
  { format: 'A0', color: 'couleur', price_per_page: 10.00 },
];

export const DEFAULT_FINISHING_PRICES: FinishingPriceEntry[] = [
  { finishing: 'none', label: 'Aucune', price: 0, per_page: false },
  { finishing: 'stapling', label: 'Agrafage', price: 0.50, per_page: false },
  { finishing: 'spiral', label: 'Reliure spirale', price: 3.00, per_page: false },
  { finishing: 'thermal', label: 'Reliure thermique', price: 5.00, per_page: false },
  { finishing: 'lamination', label: 'Plastification', price: 1.50, per_page: true },
];

export function getUnitPrice(
  prices: PrintPriceEntry[],
  format: PrintFormat,
  color: PrintColor,
): number {
  const entry = prices.find(p => p.format === format && p.color === color);
  return entry?.price_per_page ?? 0;
}

/** Paper weight multiplier: 80g=1x, 100g=+20%, 120g=+40%, 160g=+60% */
export const PAPER_WEIGHT_MULTIPLIER: Record<PaperWeight, number> = {
  80: 1.0,
  100: 1.2,
  120: 1.4,
  160: 1.6,
};

export function getFinishingCost(
  finishingPrices: FinishingPriceEntry[],
  finishing: PrintFinishing,
  pageCount: number,
): number {
  const entry = finishingPrices.find(f => f.finishing === finishing);
  if (!entry) return 0;
  return entry.per_page ? entry.price * pageCount : entry.price;
}

export function calculateTotal(
  unitPrice: number,
  copies: number,
  rectoVerso: boolean,
  paperWeight: PaperWeight = 80,
  finishing: PrintFinishing = 'none',
  finishingPrices: FinishingPriceEntry[] = DEFAULT_FINISHING_PRICES,
): number {
  const pages = rectoVerso ? 2 : 1;
  const weightMultiplier = PAPER_WEIGHT_MULTIPLIER[paperWeight];
  let total = unitPrice * weightMultiplier * pages * copies;
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
  // Finishing cost
  total += getFinishingCost(finishingPrices, finishing, pages * copies);
  return Math.round(total * 100) / 100;
}

export const FORMAT_LABELS: Record<PrintFormat, string> = {
  A4: 'A4',
  A3: 'A3',
  A2: 'A2',
  A1: 'A1',
  A0: 'A0',
};

export const COLOR_LABELS: Record<PrintColor, string> = {
  nb: 'Noir & blanc',
  couleur: 'Couleur',
};

export const FINISHING_LABELS: Record<PrintFinishing, string> = {
  none: 'Aucune',
  stapling: 'Agrafage',
  spiral: 'Reliure spirale',
  thermal: 'Reliure thermique',
  lamination: 'Plastification',
};

export const PAPER_WEIGHT_OPTIONS: { value: PaperWeight; label: string }[] = [
  { value: 80, label: '80g (standard)' },
  { value: 100, label: '100g' },
  { value: 120, label: '120g' },
  { value: 160, label: '160g (épais)' },
];

export const PRINT_FORMATS: PrintFormat[] = ['A4', 'A3', 'A2', 'A1', 'A0'];
