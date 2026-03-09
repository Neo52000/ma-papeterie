/**
 * Normalise un code EAN/GTIN :
 * - Supprime tous les espaces et caractères non-numériques
 * - Pad à gauche avec des zéros pour atteindre 13 chiffres (EAN-8 → EAN-13)
 * - Retourne null si invalide (longueur < 8 ou > 14 après nettoyage)
 */
export function normalizeEan(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.length < 8 || cleaned.length > 14) return null;
  return cleaned.padStart(13, '0');
}
