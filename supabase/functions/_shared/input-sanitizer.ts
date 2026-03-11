// ── Validation & sanitisation des inputs Edge Functions ─────────────────────

type FieldType = 'string' | 'number' | 'boolean' | 'uuid' | 'email';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldSchema {
  type: FieldType;
  required?: boolean;
  maxLength?: number; // for strings
  min?: number; // for numbers
  max?: number; // for numbers
}

/**
 * Valide et sanitise un objet d'input selon un schéma.
 * Retourne l'objet nettoyé ou lance une erreur avec le champ fautif.
 */
export function sanitizeInput<T extends Record<string, unknown>>(
  data: unknown,
  schema: Record<string, FieldSchema>,
): T {
  if (!data || typeof data !== 'object') {
    throw new InputValidationError('Corps de requête invalide');
  }

  const input = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    const val = input[key];

    if (val === undefined || val === null) {
      if (def.required) {
        throw new InputValidationError(`Champ requis manquant : ${key}`);
      }
      continue;
    }

    switch (def.type) {
      case 'string': {
        const str = String(val).trim().slice(0, def.maxLength ?? 1000);
        if (def.required && str.length === 0) {
          throw new InputValidationError(`Champ vide : ${key}`);
        }
        sanitized[key] = str;
        break;
      }
      case 'number': {
        const num = Number(val);
        if (isNaN(num)) {
          throw new InputValidationError(`Nombre invalide : ${key}`);
        }
        if (def.min !== undefined && num < def.min) {
          throw new InputValidationError(`${key} doit être >= ${def.min}`);
        }
        if (def.max !== undefined && num > def.max) {
          throw new InputValidationError(`${key} doit être <= ${def.max}`);
        }
        sanitized[key] = num;
        break;
      }
      case 'boolean':
        sanitized[key] = Boolean(val);
        break;
      case 'uuid':
        if (typeof val !== 'string' || !UUID_RE.test(val)) {
          throw new InputValidationError(`UUID invalide : ${key}`);
        }
        sanitized[key] = val;
        break;
      case 'email': {
        const email = String(val).trim().toLowerCase().slice(0, 254);
        if (!EMAIL_RE.test(email)) {
          throw new InputValidationError(`Email invalide : ${key}`);
        }
        sanitized[key] = email;
        break;
      }
    }
  }

  return sanitized as T;
}

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputValidationError';
  }
}

/**
 * Crée une Response d'erreur sécurisée (pas de stack trace).
 */
export function errorResponse(
  code: string,
  status = 400,
  corsHeaders: Record<string, string> = {},
): Response {
  const messages: Record<string, string> = {
    UNAUTHORIZED: 'Authentification requise',
    FORBIDDEN: 'Accès refusé',
    RATE_LIMITED: 'Trop de requêtes, réessayez plus tard',
    INVALID_INPUT: 'Données invalides',
    NOT_FOUND: 'Ressource introuvable',
    INTERNAL: 'Erreur serveur',
  };

  return new Response(
    JSON.stringify({ error: messages[code] || 'Erreur serveur' }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
