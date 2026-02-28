// ── Rate limiting in-memory pour Edge Functions ────────────────────────────────
//
// Note : Ce rate-limiting est par instance Deno isolée. Pour un rate-limiting
// global, utiliser un compteur Redis ou Supabase. Ceci offre une protection
// de base contre les abus.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Nettoyage périodique des entrées expirées (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 300_000);

/**
 * Vérifie si la requête respecte la limite de débit.
 *
 * @param key        Identifiant unique (IP, userId, etc.)
 * @param maxRequests Nombre max de requêtes par fenêtre (défaut: 30)
 * @param windowMs   Taille de la fenêtre en ms (défaut: 60 000 = 1 min)
 * @returns true si la requête est autorisée, false si rate-limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Extrait une clé de rate-limiting depuis la requête (IP ou fallback).
 */
export function getRateLimitKey(req: Request, prefix: string = ''): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  return `${prefix}:${ip}`;
}

/**
 * Retourne une Response 429 formatée.
 */
export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    },
  );
}
