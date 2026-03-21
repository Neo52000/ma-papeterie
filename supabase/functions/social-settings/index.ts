import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "social-settings",
  auth: "admin",
  rateLimit: { prefix: "social-settings", max: 30, windowMs: 60_000 },
  methods: ["GET", "PUT"],
}, async ({ supabaseAdmin, body, corsHeaders, req }) => {
  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("social_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) throw error;

    return { success: true, settings: data };
  }

  if (req.method === "PUT") {
    const updates = body;

    // Get existing settings row id
    const { data: existing } = await supabaseAdmin
      .from("social_settings")
      .select("id")
      .limit(1)
      .single();

    if (!existing) {
      return jsonResponse({ error: "Paramètres introuvables" }, 404, corsHeaders);
    }

    const { data, error } = await supabaseAdmin
      .from("social_settings")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, settings: data };
  }

  return jsonResponse({ error: "Méthode non autorisée" }, 405, corsHeaders);
}));
