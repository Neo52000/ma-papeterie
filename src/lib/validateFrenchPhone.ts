/**
 * Normalise et valide un numéro de mobile français au format E.164.
 *
 * Accepte : +33612345678, 0612345678, 06 12 34 56 78, 33612345678
 * Rejette : fixes (01-05), numéros non-français, formats invalides
 *
 * @returns Le numéro normalisé (+33...) ou null si invalide.
 */
export function validateFrenchMobile(phone: string): string | null {
  const cleaned = phone.replace(/[\s.\-()]/g, "");
  let normalized: string;

  if (cleaned.startsWith("+33")) {
    normalized = cleaned;
  } else if (cleaned.startsWith("33") && cleaned.length === 11) {
    normalized = "+" + cleaned;
  } else if (cleaned.startsWith("0") && cleaned.length === 10) {
    normalized = "+33" + cleaned.slice(1);
  } else {
    return null;
  }

  // Only French mobile: 06xx and 07xx
  if (/^\+33[67]\d{8}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

/**
 * Formate un numéro E.164 pour l'affichage : +33 6 12 34 56 78
 */
export function formatFrenchPhone(phone: string): string {
  if (!phone.startsWith("+33") || phone.length !== 12) return phone;
  const digits = phone.slice(3); // 612345678
  return `+33 ${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
}
