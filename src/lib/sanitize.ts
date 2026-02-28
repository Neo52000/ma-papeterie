// ── Sanitisation HTML pour prévenir les attaques XSS ────────────────────────
//
// Utilise le DOMParser natif du navigateur pour nettoyer le HTML.
// Supprime les balises dangereuses (script, iframe, etc.) et les
// attributs d'événements (onclick, onerror, etc.).

/** Balises considérées comme dangereuses et à supprimer */
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input',
  'textarea', 'select', 'button', 'link', 'meta', 'base',
  'applet', 'math', 'svg',
];

/**
 * Nettoie une chaîne HTML en supprimant les éléments et attributs dangereux.
 * Retourne du HTML sûr, prêt à être utilisé avec dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');

  // 1. Supprimer les balises dangereuses
  const selector = DANGEROUS_TAGS.join(', ');
  doc.querySelectorAll(selector).forEach((el) => el.remove());

  // 2. Supprimer les attributs dangereux sur tous les éléments restants
  doc.querySelectorAll('*').forEach((el) => {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase().trim();

      // Supprimer les event handlers (onclick, onerror, onload, etc.)
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Supprimer les URLs javascript:
      if (value.startsWith('javascript:') || value.startsWith('data:text/html')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Supprimer style contenant expression() ou url()
      if (name === 'style' && (/expression\s*\(/i.test(value) || /url\s*\(/i.test(value))) {
        el.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}
