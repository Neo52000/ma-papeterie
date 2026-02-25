// ── CORS centralisé — origines autorisées ─────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://ma-papeterie.fr',
  'https://www.ma-papeterie.fr',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

/**
 * Retourne les headers CORS restreints à l'origine vérifiée.
 * Si l'origin de la requête n'est pas dans la whitelist, on renvoie
 * la première origine autorisée (production).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

/**
 * Gère la pré-requête CORS OPTIONS.
 * Retourne une Response prête si c'est un OPTIONS, sinon null.
 */
export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
