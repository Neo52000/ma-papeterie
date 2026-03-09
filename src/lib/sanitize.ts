// ── Sanitisation HTML pour prévenir les attaques XSS ────────────────────────
//
// Utilise le DOMParser natif du navigateur pour nettoyer le HTML.
// Supprime les balises dangereuses (script, iframe, etc.), les SVG
// potentiellement malveillants, les data: URIs et les attributs
// d'événements (onclick, onerror, etc.).
// Le matching est insensible à la casse pour contrer les techniques d'évasion.

/** Balises considérées comme dangereuses et à supprimer (case-insensitive via querySelectorAll) */
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'input',
  'textarea', 'select', 'button', 'link', 'meta', 'base',
  'applet', 'math', 'svg', 'style', 'template', 'slot',
  'noscript', 'xmp', 'plaintext', 'listing',
];

/** Protocols considered dangerous in URLs */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:',
  'mhtml:',
  'x-javascript:',
];

/**
 * Check if a URL attribute value is potentially dangerous.
 * Uses case-insensitive matching and strips whitespace/control chars
 * to prevent evasion techniques like "java\tscript:" or "DATA:text/html".
 */
function isDangerousUrl(value: string): boolean {
  // Strip whitespace, null bytes, and control characters that browsers may ignore
  const cleaned = value.replace(/[\s\x00-\x1f\x7f-\x9f]+/g, '').toLowerCase();

  return DANGEROUS_PROTOCOLS.some((proto) => cleaned.startsWith(proto));
}

/**
 * Check if a style attribute value contains dangerous CSS expressions.
 * Case-insensitive to prevent evasion.
 */
function isDangerousStyle(value: string): boolean {
  const lower = value.toLowerCase();
  // expression() — IE CSS expression
  if (/expression\s*\(/i.test(lower)) return true;
  // url() — can load external resources or trigger javascript:
  if (/url\s*\(/i.test(lower)) return true;
  // -moz-binding — Firefox XBL
  if (/-moz-binding\s*:/i.test(lower)) return true;
  // behavior — IE HTC
  if (/behavior\s*:/i.test(lower)) return true;
  return false;
}

/** Attributes that can contain URLs */
const URL_ATTRIBUTES = new Set([
  'href', 'src', 'action', 'formaction', 'xlink:href',
  'data', 'poster', 'background', 'cite', 'codebase',
  'dynsrc', 'lowsrc', 'ping', 'srcset',
]);

/**
 * Nettoie une chaîne HTML en supprimant les éléments et attributs dangereux.
 * Retourne du HTML sûr, prêt à être utilisé avec dangerouslySetInnerHTML.
 *
 * Gère notamment :
 * - Les balises SVG et MathML malveillantes
 * - Les data: URIs (potentiel vecteur XSS)
 * - Le matching insensible à la casse pour contrer les évasions
 * - Les caractères de contrôle dans les URL (java\x09script:, etc.)
 * - Les CSS expressions et -moz-binding
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');

  // 1. Supprimer les balises dangereuses (querySelectorAll est case-insensitive pour HTML)
  const selector = DANGEROUS_TAGS.join(', ');
  doc.querySelectorAll(selector).forEach((el) => el.remove());

  // 2. Also handle SVG/MathML that might have been parsed as foreign content
  //    by checking tag names case-insensitively
  const allElements = doc.querySelectorAll('*');
  const dangerousTagsUpper = new Set(DANGEROUS_TAGS.map((t) => t.toUpperCase()));

  allElements.forEach((el) => {
    // Check tag name (handles case variants like SCRIPT, Script, etc.)
    if (dangerousTagsUpper.has(el.tagName.toUpperCase())) {
      el.remove();
      return;
    }

    // Check for SVG-related namespace elements that might contain scripts
    if (el.namespaceURI && el.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
      el.remove();
      return;
    }
  });

  // 3. Supprimer les attributs dangereux sur tous les éléments restants
  doc.querySelectorAll('*').forEach((el) => {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      // Supprimer les event handlers (onclick, onerror, onload, etc.)
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Check URL-bearing attributes for dangerous protocols
      if (URL_ATTRIBUTES.has(name) && isDangerousUrl(value)) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Supprimer style contenant expression(), url(), -moz-binding, behavior
      if (name === 'style' && isDangerousStyle(value)) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Block any attribute whose value contains a dangerous protocol
      // (covers custom attributes or unusual attribute names)
      if (isDangerousUrl(value)) {
        el.removeAttribute(attr.name);
        continue;
      }
    }
  });

  return doc.body.innerHTML;
}
