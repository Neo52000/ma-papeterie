/**
 * Normalise et valide un code EAN/GTIN.
 *
 * Supporte :
 * - EAN-8 (8 chiffres)
 * - EAN-13 / ISBN-13 (13 chiffres)
 * - UPC-A (12 chiffres)
 * - GTIN-14 (14 chiffres)
 *
 * Comportement :
 * - Supprime tous les espaces et caractères non-numériques
 * - Pad à gauche avec des zéros pour atteindre 13 chiffres (EAN-8/UPC-A → EAN-13)
 * - Valide le chiffre de contrôle si `strict` est true
 * - Retourne null si invalide
 */

/** Calcule le chiffre de contrôle EAN/GTIN (modulo 10, pondération 1/3) */
function computeCheckDigit(digits: string): number {
  const len = digits.length;
  let sum = 0;
  for (let i = 0; i < len - 1; i++) {
    const d = parseInt(digits[i], 10);
    // Pondération alternée depuis la droite : 1, 3, 1, 3...
    const weight = (len - 1 - i) % 2 === 0 ? 1 : 3;
    sum += d * weight;
  }
  return (10 - (sum % 10)) % 10;
}

/** Vérifie si le chiffre de contrôle EAN est valide */
export function isValidEanCheckDigit(ean: string): boolean {
  if (!/^\d{8,14}$/.test(ean)) return false;
  const expected = computeCheckDigit(ean);
  const actual = parseInt(ean[ean.length - 1], 10);
  return expected === actual;
}

/**
 * Normalise un code EAN/GTIN.
 *
 * @param raw - Le code EAN brut (peut contenir des espaces, tirets, etc.)
 * @param strict - Si true, valide le chiffre de contrôle (défaut: false pour rétrocompatibilité)
 * @returns Le code EAN normalisé (13 chiffres) ou null si invalide
 */
export function normalizeEan(
  raw: string | null | undefined,
  strict = false,
): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (cleaned.length < 8 || cleaned.length > 14) return null;

  // Pad à 13 chiffres (EAN-13 standard)
  const normalized = cleaned.padStart(13, "0");

  // Validation du chiffre de contrôle en mode strict
  if (strict && !isValidEanCheckDigit(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Normalise un EAN avec rapport d'erreur (pour les imports).
 * Retourne toujours l'EAN normalisé mais signale les anomalies.
 */
export function normalizeEanWithReport(
  raw: string | null | undefined,
): { ean: string | null; valid: boolean; warning: string | null } {
  if (!raw) return { ean: null, valid: true, warning: null };

  const cleaned = raw.replace(/[^0-9]/g, "");
  if (cleaned.length < 8 || cleaned.length > 14) {
    return {
      ean: null,
      valid: false,
      warning: `EAN invalide (longueur ${cleaned.length}): ${raw}`,
    };
  }

  const normalized = cleaned.padStart(13, "0");
  const checkValid = isValidEanCheckDigit(normalized);

  return {
    ean: normalized,
    valid: checkValid,
    warning: checkValid
      ? null
      : `EAN avec chiffre de contrôle invalide: ${raw} → ${normalized}`,
  };
}
