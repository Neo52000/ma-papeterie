/**
 * Champ honeypot invisible pour détecter les bots.
 * Les bots remplissent automatiquement les champs cachés,
 * les vrais utilisateurs ne les voient jamais.
 *
 * Usage :
 *   <HoneypotField />
 *   // Puis côté validation :
 *   if (formData.website !== '') { /* c'est un bot * / }
 */
export const HoneypotField = () => (
  <input
    type="text"
    name="website"
    style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
    tabIndex={-1}
    autoComplete="off"
    aria-hidden="true"
  />
);
