import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdmin, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";
import { safeErrorResponse } from "../_shared/sanitize-error.ts";

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, "social-settings");
  if (!(await checkRateLimit(rlKey, 30, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    // ── Auth (admin uniquement) ─────────────────────────────────────────────
    const authResult = await requireAdmin(req, corsHeaders);
    if (isAuthError(authResult)) return authResult.error;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("social_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, settings: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT") {
      const updates = await req.json();

      // Get existing settings row id
      const { data: existing } = await supabase
        .from("social_settings")
        .select("id")
        .limit(1)
        .single();

      if (!existing) {
        return new Response(JSON.stringify({ error: "Paramètres introuvables" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("social_settings")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, settings: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, { context: "social-settings" });
  }
});
