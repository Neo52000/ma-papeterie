// ── Handler factory pour Edge Functions ──────────────────────────────────────────
//
// Encapsule le boilerplate commun : CORS, auth, rate limiting, client Supabase,
// parsing du body et error handling.
//
// Usage :
//   Deno.serve(createHandler({
//     name: "ma-fonction",
//     auth: "admin",
//     rateLimit: { prefix: "ma-fn", max: 10, windowMs: 60_000 },
//   }, async ({ supabaseAdmin, body, userId }) => {
//     // ... logique métier ...
//     return { success: true, data: result };
//   }));

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "./cors.ts";
import {
  requireAuth,
  requireAdmin,
  requireApiSecret,
  requireAdminOrSecret,
  isAuthError,
} from "./auth.ts";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitResponse,
} from "./rate-limit.ts";
import { safeErrorResponse } from "./sanitize-error.ts";
import { checkBodySize } from "./body-limit.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export type AuthMode = "none" | "auth" | "admin" | "secret" | "admin-or-secret";

export interface HandlerOptions {
  /** Nom de la fonction (pour les logs structurés) */
  name: string;
  /** Mode d'authentification. Défaut : "none" */
  auth?: AuthMode;
  /** Config rate limiting. Omettre pour désactiver. */
  rateLimit?: { prefix: string; max?: number; windowMs?: number };
  /** Méthodes HTTP autorisées. Défaut : ["POST"] */
  methods?: string[];
  /** Désactiver le parsing automatique du body JSON. Défaut : false */
  rawBody?: boolean;
  /** Taille max du body en octets. Défaut : 10 Mo. Mettre 0 pour désactiver. */
  maxBodyBytes?: number;
}

export interface HandlerContext {
  req: Request;
  corsHeaders: Record<string, string>;
  /** Unique request ID for log correlation */
  requestId: string;
  /** Présent quand auth = "auth" ou "admin" */
  userId?: string;
  email?: string;
  /** Client Supabase admin (service role) pré-construit */
  supabaseAdmin: SupabaseClient;
  /** Body JSON parsé (null pour GET ou si rawBody = true) */
  body: unknown;
}

export type HandlerFn = (
  ctx: HandlerContext,
) => Promise<Response | Record<string, unknown>>;

// ── Factory ──────────────────────────────────────────────────────────────────

export function createHandler(
  opts: HandlerOptions,
  fn: HandlerFn,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    // 1. CORS preflight
    const preFlightResponse = handleCorsPreFlight(req);
    if (preFlightResponse) return preFlightResponse;
    const corsHeaders = getCorsHeaders(req);

    // 2. Vérification méthode HTTP
    const allowedMethods = opts.methods ?? ["POST"];
    if (!allowedMethods.includes(req.method)) {
      return jsonResponse(
        { error: "Méthode non autorisée" },
        405,
        corsHeaders,
      );
    }

    // 3. Rate limiting
    if (opts.rateLimit) {
      const rlKey = getRateLimitKey(req, opts.rateLimit.prefix);
      const allowed = await checkRateLimit(
        rlKey,
        opts.rateLimit.max ?? 30,
        opts.rateLimit.windowMs ?? 60_000,
      );
      if (!allowed) return rateLimitResponse(corsHeaders);
    }

    // 4. Authentification
    let userId: string | undefined;
    let email: string | undefined;

    switch (opts.auth ?? "none") {
      case "auth": {
        const result = await requireAuth(req, corsHeaders);
        if (isAuthError(result)) return result.error;
        userId = result.userId;
        email = result.email;
        break;
      }
      case "admin": {
        const result = await requireAdmin(req, corsHeaders);
        if (isAuthError(result)) return result.error;
        userId = result.userId;
        email = result.email;
        break;
      }
      case "secret": {
        const err = requireApiSecret(req, corsHeaders);
        if (err) return err;
        break;
      }
      case "admin-or-secret": {
        const err = await requireAdminOrSecret(req, corsHeaders);
        if (err) return err;
        break;
      }
      case "none":
        break;
    }

    // 5. Vérification taille du body
    if (opts.maxBodyBytes !== 0 && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const bodyTooLarge = checkBodySize(req, corsHeaders, opts.maxBodyBytes);
      if (bodyTooLarge) return bodyTooLarge;
    }

    // 6. Client Supabase admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 7. Parsing du body (skip pour GET/HEAD/OPTIONS ou si rawBody)
    let body: unknown = null;
    if (
      !opts.rawBody &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method)
    ) {
      try {
        body = await req.json();
      } catch {
        return jsonResponse(
          { error: "Corps JSON invalide" },
          400,
          corsHeaders,
        );
      }
    }

    // 8. Exécution du handler
    try {
      const result = await fn({
        req,
        corsHeaders,
        requestId,
        userId,
        email,
        supabaseAdmin,
        body,
      });

      const durationMs = Date.now() - startTime;
      console.log(JSON.stringify({
        fn: opts.name, requestId, status: 200,
        durationMs, userId: userId ?? null,
      }));

      // Si le handler retourne directement une Response, on la passe telle quelle
      if (result instanceof Response) return result;

      // Sinon, on enveloppe dans une réponse JSON 200
      return jsonResponse(result, 200, corsHeaders);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(JSON.stringify({
        fn: opts.name, requestId, status: 500,
        durationMs, error: error instanceof Error ? error.message : String(error),
      }));
      return safeErrorResponse(error, corsHeaders, {
        context: opts.name,
        status: 500,
      });
    }
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Construit une Response JSON avec headers CORS */
export function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
