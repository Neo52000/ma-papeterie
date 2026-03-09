// ── Validation de taille du body pour Edge Functions ────────────────────────
//
// Limite la taille des requêtes pour prévenir les abus (DoS par envoi
// de gros payloads). Vérifie le header Content-Length si disponible.

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

/**
 * Vérifie que la taille du body ne dépasse pas la limite.
 * Retourne une Response 413 si le body est trop gros, sinon null.
 */
export function checkBodySize(
  req: Request,
  corsHeaders: Record<string, string>,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Response | null {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return new Response(
      JSON.stringify({ error: `Corps de requête trop volumineux (max ${maxMb} Mo)` }),
      {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  return null;
}
