/**
 * Vérifie si un formulaire a été soumis par un bot (honeypot rempli).
 */
export const isHoneypotFilled = (formData: FormData | Record<string, unknown>): boolean => {
  if (formData instanceof FormData) {
    return (formData.get('website') ?? '') !== '';
  }
  return (formData.website ?? '') !== '';
};
