type PriceMode = 'ttc' | 'ht';

/**
 * Returns the numeric price value based on the mode.
 * Falls back to the other price if the preferred one is null.
 */
export function getPriceValue(
  priceHt: number | null,
  priceTtc: number | null,
  mode: PriceMode
): number {
  if (mode === 'ht') return priceHt ?? priceTtc ?? 0;
  return priceTtc ?? priceHt ?? 0;
}

/**
 * Returns a formatted price string with the mode suffix.
 * Example: "12.50 € HT" or "15.00 € TTC"
 */
export function formatPrice(
  priceHt: number | null,
  priceTtc: number | null,
  mode: PriceMode
): string {
  const value = getPriceValue(priceHt, priceTtc, mode);
  const suffix = mode === 'ht' ? 'HT' : 'TTC';
  return `${value.toFixed(2)} \u20AC ${suffix}`;
}

/**
 * Returns the suffix label for the current mode.
 */
export function priceLabel(mode: PriceMode): string {
  return mode === 'ht' ? 'HT' : 'TTC';
}
