import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "set-alkor-cookie",
  auth: "admin",
  rateLimit: { prefix: "set-alkor-cookie", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, userId }) => {
  const { mode } = body as any;

  if (mode === "credentials") {
    // Store Alkor login credentials (client_code, username, password) and optional base_url
    const { client_code, username, password, base_url } = body as any;

    if (!client_code || !username || !password) {
      return jsonResponse(
        { error: "Les 3 champs sont requis : code client, identifiant, mot de passe" },
        400, corsHeaders,
      );
    }

    const now = new Date().toISOString();
    const secrets = [
      { key: "ALKOR_CLIENT_CODE", value: client_code.trim() },
      { key: "ALKOR_USERNAME", value: username.trim() },
      { key: "ALKOR_PASSWORD", value: password.trim() },
    ];

    // Store base URL if provided (allows changing the B2B site URL)
    if (base_url && typeof base_url === "string" && base_url.trim()) {
      secrets.push({ key: "ALKOR_BASE_URL", value: base_url.trim().replace(/\/+$/, "") });
    }

    for (const secret of secrets) {
      const { error: upsertError } = await supabaseAdmin
        .from("admin_secrets")
        .upsert(
          { key: secret.key, value: secret.value, updated_at: now, updated_by: userId },
          { onConflict: "key" }
        );

      if (upsertError) {
        console.error(`Error storing ${secret.key}:`, upsertError);
        return jsonResponse(
          { error: `Erreur lors de la sauvegarde de ${secret.key}` },
          500, corsHeaders,
        );
      }
    }

    return { success: true, message: "Identifiants Alkor enregistrés" };
  }

  // Default mode: store cookie directly (legacy)
  const { cookie_value } = body as any;

  if (!cookie_value || typeof cookie_value !== "string" || cookie_value.trim().length === 0) {
    return jsonResponse(
      { error: "Valeur du cookie requise" },
      400, corsHeaders,
    );
  }

  const { error: upsertError } = await supabaseAdmin
    .from("admin_secrets")
    .upsert(
      {
        key: "ALKOR_SESSION_COOKIE",
        value: cookie_value.trim(),
        updated_at: new Date().toISOString(),
        updated_by: userId,
      },
      { onConflict: "key" }
    );

  if (upsertError) {
    console.error("Error storing cookie:", upsertError);
    return jsonResponse(
      { error: "Erreur lors de la sauvegarde du cookie" },
      500, corsHeaders,
    );
  }

  return { success: true, message: "Cookie de session mis à jour" };
}));
