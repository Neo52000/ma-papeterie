// ── Sanitisation des messages d'erreur pour les réponses HTTP ─────────────────
// Ne jamais exposer error.message brut au client (fuite d'infos internes).

/** Messages génériques par type d'erreur */
const GENERIC_MESSAGES: Record<string, string> = {
  auth: "Erreur d'authentification",
  validation: "Données invalides",
  not_found: "Ressource introuvable",
  conflict: "Conflit de données",
  rate_limit: "Trop de requêtes, réessayez plus tard",
  default: "Une erreur interne est survenue",
};

/**
 * Retourne un message d'erreur sûr pour le client.
 * Le message brut est loggé côté serveur mais jamais renvoyé.
 */
export function safeErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  opts?: { status?: number; category?: keyof typeof GENERIC_MESSAGES; context?: string },
): Response {
  const status = opts?.status ?? 500;
  const category = opts?.category ?? "default";
  const publicMessage = GENERIC_MESSAGES[category] ?? GENERIC_MESSAGES.default;

  // Log complet côté serveur uniquement
  const rawMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${opts?.context ?? "edge-fn"}] ${rawMessage}`);

  return new Response(
    JSON.stringify({ error: publicMessage }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
