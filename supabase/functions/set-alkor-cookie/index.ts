import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const rlKey = getRateLimitKey(req, 'set-alkor-cookie');
  if (!(await checkRateLimit(rlKey, 5, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "super_admin"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Accès réservé aux administrateurs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { mode } = body;

    if (mode === "credentials") {
      // Store Alkor login credentials (client_code, username, password)
      const { client_code, username, password } = body;

      if (!client_code || !username || !password) {
        return new Response(
          JSON.stringify({ error: "Les 3 champs sont requis : code client, identifiant, mot de passe" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();
      const secrets = [
        { key: "ALKOR_CLIENT_CODE", value: client_code.trim() },
        { key: "ALKOR_USERNAME", value: username.trim() },
        { key: "ALKOR_PASSWORD", value: password.trim() },
      ];

      for (const secret of secrets) {
        const { error: upsertError } = await supabase
          .from("admin_secrets")
          .upsert(
            { key: secret.key, value: secret.value, updated_at: now, updated_by: user.id },
            { onConflict: "key" }
          );

        if (upsertError) {
          console.error(`Error storing ${secret.key}:`, upsertError);
          return new Response(
            JSON.stringify({ error: `Erreur lors de la sauvegarde de ${secret.key}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Identifiants Alkor enregistrés" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default mode: store cookie directly (legacy)
    const { cookie_value } = body;

    if (!cookie_value || typeof cookie_value !== "string" || cookie_value.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Valeur du cookie requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: upsertError } = await supabase
      .from("admin_secrets")
      .upsert(
        {
          key: "ALKOR_SESSION_COOKIE",
          value: cookie_value.trim(),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "key" }
      );

    if (upsertError) {
      console.error("Error storing cookie:", upsertError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la sauvegarde du cookie" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Cookie de session mis à jour" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("set-alkor-cookie error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
