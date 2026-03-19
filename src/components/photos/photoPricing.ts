export type PhotoFormat = '10x15' | '13x18' | '15x20' | '20x30' | '30x45';
export type PhotoFinish = 'mat' | 'brillant';

export interface PhotoPriceEntry {
  format: PhotoFormat;
  label: string;
  price_per_unit: number;
}

export const DEFAULT_PHOTO_PRICES: PhotoPriceEntry[] = [
  { format: '10x15', label: '10 x 15 cm', price_per_unit: 0.15 },
  { format: '13x18', label: '13 x 18 cm', price_per_unit: 0.30 },
  { format: '15x20', label: '15 x 20 cm', price_per_unit: 0.50 },
  { format: '20x30', label: '20 x 30 cm', price_per_unit: 2.00 },
  { format: '30x45', label: '30 x 45 cm', price_per_unit: 5.00 },
];

export const PHOTO_FORMATS: PhotoFormat[] = ['10x15', '13x18', '15x20', '20x30', '30x45'];

export const FINISH_LABELS: Record<PhotoFinish, string> = {
  mat: 'Mat',
  brillant: 'Brillant',
};

export function getPhotoUnitPrice(
  prices: PhotoPriceEntry[],
  format: PhotoFormat,
): number {
  const entry = prices.find(p => p.format === format);
  return entry?.price_per_unit ?? 0;
}

export function getFormatLabel(
  prices: PhotoPriceEntry[],
  format: PhotoFormat,
): string {
  const entry = prices.find(p => p.format === format);
  return entry?.label ?? format;
}

export interface PhotoItem {
  id: string;
  file: File;
  preview: string;
  format: PhotoFormat;
  quantity: number;
}

export function calculatePhotoOrderTotal(
  items: PhotoItem[],
  prices: PhotoPriceEntry[],
): number {
  const total = items.reduce((sum, item) => {
    const unitPrice = getPhotoUnitPrice(prices, item.format);
    return sum + unitPrice * item.quantity;
  }, 0);
  return Math.round(total * 100) / 100;
}

export const MAX_PHOTOS = 50;
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
