/**
 * Règle de marge minimum — OBLIGATOIRE pour tous les produits.
 *
 * Formule de référence (marge sur prix de vente) :
 *   marge (%) = (Prix HT − Coût achat) / Prix HT × 100
 */

/** Marge minimum autorisée (%) sur le prix de vente HT */
export const MINIMUM_MARGIN_PERCENT = 10;

/** Calcule la marge sur prix de vente : (pv − pa) / pv × 100 (arrondi 4 décimales) */
export function calculateMargin(priceHt: number, costPrice: number): number {
  if (priceHt <= 0) return 0;
  return Math.round(((priceHt - costPrice) / priceHt) * 100 * 10000) / 10000;
}

/** Calcule le prix HT minimum pour respecter la marge donnée */
export function minimumSellingPrice(
  costPrice: number,
  minMargin: number = MINIMUM_MARGIN_PERCENT,
): number {
  return costPrice / (1 - minMargin / 100);
}

/** Vérifie si la marge est supérieure ou égale au minimum (tolérance flottante) */
export function isMarginValid(
  priceHt: number,
  costPrice: number,
  minMargin: number = MINIMUM_MARGIN_PERCENT,
): boolean {
  const EPSILON = 0.001;
  return calculateMargin(priceHt, costPrice) >= minMargin - EPSILON;
}
