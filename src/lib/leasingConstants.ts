/** Minimum product price HT to show leasing badge */
export const LEASING_MIN_PRODUCT_HT = 400;

/** Minimum cart total HT to show leasing CTA in cart */
export const LEASING_MIN_CART_HT = 800;

/** Available leasing durations in months */
export const LEASING_DURATIONS = [24, 36, 48, 60] as const;

/** Product categories excluded from leasing (consommables, not furniture) */
export const EXCLUDED_CATEGORIES = [
  "fournitures",
  "papeterie",
  "scolaire",
  "consommables",
] as const;

/** Legal disclaimer — must appear on every simulated amount */
export const LEASING_DISCLAIMER =
  "Simulation indicative non contractuelle. Financement soumis à acceptation Leasecom.";

/** Profile types for the leasing quote form */
export const PROFILE_TYPES = [
  { value: "tpe", label: "TPE / PME" },
  { value: "liberal", label: "Profession libérale" },
  { value: "cowork", label: "Espace coworking" },
  { value: "association", label: "Association" },
  { value: "autre", label: "Autre" },
] as const;

/** Check if a category is eligible for leasing */
export function isCategoryEligible(category: string): boolean {
  return !EXCLUDED_CATEGORIES.includes(
    category.toLowerCase() as (typeof EXCLUDED_CATEGORIES)[number]
  );
}
