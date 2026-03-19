import { useMemo } from "react";
import { LEASING_MIN_PRODUCT_HT } from "@/lib/leasingConstants";

/**
 * Approximate monthly leasing coefficients (not displayed to the user).
 * Only the resulting monthly amounts are shown, with a legal disclaimer.
 */
const LEASING_RATES: Record<number, number> = {
  13: 0.082,
  24: 0.0435,
  36: 0.031,
  48: 0.025,
  60: 0.021,
};

export interface LeasingCalculation {
  monthlyHT: number;
  monthlyTTC: number;
  totalCost: number;
  duration: number;
  isEligible: boolean;
}

export function calculateLeasing(amountHT: number, duration: number): LeasingCalculation {
  const isEligible = amountHT >= LEASING_MIN_PRODUCT_HT;
  const rate = LEASING_RATES[duration] ?? LEASING_RATES[36];
  const monthlyHT = Math.round(amountHT * rate * 100) / 100;
  const monthlyTTC = Math.round(monthlyHT * 1.2 * 100) / 100;
  const totalCost = Math.round(monthlyHT * duration * 100) / 100;
  return { monthlyHT, monthlyTTC, totalCost, duration, isEligible };
}

export function useLeasingCalculator(amountHT: number, duration: number = 36): LeasingCalculation {
  return useMemo(
    () => calculateLeasing(amountHT, duration),
    [amountHT, duration]
  );
}
