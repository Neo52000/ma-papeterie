// ── Authentification partagée pour les Edge Functions ──────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AuthSuccess {
  userId: string;
  email?: string;
}

interface AuthFailure {
  error: Response;
}

/**
 * Vérifie que la requête contient un token JWT valide.
 * Retourne le userId si OK, sinon une Response d'erreur 401.
 */
export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Non autorisé — token manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Token invalide ou expiré' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  return { userId: user.id, email: user.email };
}

/**
 * Vérifie que l'utilisateur est admin ou super_admin.
 * Retourne le userId si OK, sinon une Response d'erreur 401/403.
 */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthSuccess | AuthFailure> {
  const authResult = await requireAuth(req, corsHeaders);
  if ('error' in authResult) return authResult;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: role } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', authResult.userId)
    .single();

  if (!role || !['admin', 'super_admin'].includes(role.role)) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Accès interdit — rôle admin requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  return authResult;
}

/** Type guard pour vérifier si le résultat est une erreur */
export function isAuthError(result: AuthSuccess | AuthFailure): result is AuthFailure {
  return 'error' in result;
}

/**
 * Vérifie que la requête contient le header x-api-secret valide.
 * Utilisé pour les fonctions cron/webhook qui n'ont pas de JWT utilisateur.
 * Retourne null si OK, sinon une Response d'erreur 401.
 */
export function requireApiSecret(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  const secret = req.headers.get('x-api-secret');
  const expected = Deno.env.get('API_CRON_SECRET');
  if (!expected || secret !== expected) {
    return new Response(
      JSON.stringify({ error: 'Secret invalide' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  return null;
}
