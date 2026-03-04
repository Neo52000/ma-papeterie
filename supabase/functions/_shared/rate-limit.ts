// ── Rate limiting global pour Edge Functions ────────────────────────────────────
//
// Utilise une table Supabase (rate_limit_entries) + fonction SQL atomique
// pour un rate limiting partagé entre toutes les instances Deno.
// Fallback in-memory si la DB est inaccessible.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Fallback in-memory (si la DB est indisponible) ──────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 300_000);

function checkRateLimitInMemory(
  key: string,
  maxRequests: number,
  windowMs: number,
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

// ── Rate limiting global (DB-backed) ────────────────────────────────────────

/**
 * Vérifie si la requête respecte la limite de débit.
 * Utilise la table Supabase `rate_limit_entries` pour un comptage global.
 * Fallback in-memory si la DB échoue.
 *
 * @param key        Identifiant unique (IP, userId, etc.)
 * @param maxRequests Nombre max de requêtes par fenêtre (défaut: 30)
 * @param windowMs   Taille de la fenêtre en ms (défaut: 60 000 = 1 min)
 * @returns true si la requête est autorisée, false si rate-limited
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return checkRateLimitInMemory(key, maxRequests, windowMs);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const windowSeconds = Math.ceil(windowMs / 1000);

    const { data, error } = await supabase.rpc('check_rate_limit_fn', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('[rate-limit] DB error, falling back to in-memory:', error.message);
      return checkRateLimitInMemory(key, maxRequests, windowMs);
    }

    return data as boolean;
  } catch (err) {
    console.error('[rate-limit] Exception, falling back to in-memory:', err);
    return checkRateLimitInMemory(key, maxRequests, windowMs);
  }
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
