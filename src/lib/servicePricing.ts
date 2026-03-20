import type { PrintPriceEntry, PrintFormat, PrintColor, PrintFinishing, PaperWeight, FinishingPriceEntry } from '@/components/print/printPricing';
import type { PhotoPriceEntry, PhotoFormat, PhotoPaperType } from '@/components/photos/photoPricing';
import { getUnitPrice, PAPER_WEIGHT_MULTIPLIER, getFinishingCost, DEFAULT_FINISHING_PRICES } from '@/components/print/printPricing';
import { getPhotoUnitPrice } from '@/components/photos/photoPricing';

export const TVA_RATE = 0.20;
export const DELIVERY_FEE = 5.90;

export function toTTC(ht: number): number {
  return Math.round(ht * (1 + TVA_RATE) * 100) / 100;
}

export function toHT(ttc: number): number {
  return Math.round((ttc / (1 + TVA_RATE)) * 100) / 100;
}

export interface PrintItemConfig {
  format: PrintFormat;
  color: PrintColor;
  rectoVerso: boolean;
  paperWeight: PaperWeight;
  finishing: PrintFinishing;
  copies: number;
}

export interface PhotoItemConfig {
  format: PhotoFormat;
  paperType: PhotoPaperType;
  whiteMargin: boolean;
  quantity: number;
}

export function calculatePrintItemTotal(
  config: PrintItemConfig,
  prices: PrintPriceEntry[],
  finishingPrices: FinishingPriceEntry[] = DEFAULT_FINISHING_PRICES,
): { unitPrice: number; lineTotal: number } {
  const basePrice = getUnitPrice(prices, config.format, config.color);
  const pages = config.rectoVerso ? 2 : 1;
  const weightMultiplier = PAPER_WEIGHT_MULTIPLIER[config.paperWeight];

  let total = basePrice * weightMultiplier * pages * config.copies;

  if (config.rectoVerso) {
    total *= 0.9;
  }

  if (config.copies >= 100) {
    total *= 0.8;
  } else if (config.copies >= 50) {
    total *= 0.9;
  }

  total += getFinishingCost(finishingPrices, config.finishing, pages * config.copies);

  const lineTotal = Math.round(total * 100) / 100;
  const unitPrice = config.copies > 0
    ? Math.round((lineTotal / config.copies) * 100) / 100
    : 0;

  return { unitPrice, lineTotal };
}

export function calculatePhotoItemTotal(
  config: PhotoItemConfig,
  prices: PhotoPriceEntry[],
): { unitPrice: number; lineTotal: number } {
  const unitPrice = getPhotoUnitPrice(prices, config.format, config.paperType);
  const lineTotal = Math.round(unitPrice * config.quantity * 100) / 100;
  return { unitPrice, lineTotal };
}
