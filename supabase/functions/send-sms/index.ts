// ── send-sms : Envoi SMS central via Android SMS Gateway ────────────────────
//
// Appelé en fire-and-forget depuis les hooks frontend ou d'autres Edge Functions.
// Vérifie les préférences utilisateur, valide le téléphone, rate-limite, puis envoie.

import { createHandler, jsonResponse } from "../_shared/handler.ts";
import {
  getSmsGatewayConfig,
  validateFrenchMobile,
  renderTemplate,
  sendSmsViaGateway,
} from "../_shared/sms-client.ts";

interface SendSmsRequest {
  /** Type de notification SMS */
  sms_type: "order_status" | "shipping_alert" | "service_order" | "wishlist_alert" | "promotional" | "test";
  /** Numéro de téléphone du destinataire */
  recipient_phone: string;
  /** ID utilisateur (optionnel, pour vérifier les préférences) */
  user_id?: string;
  /** Slug du template SMS à utiliser */
  template_slug: string;
  /** Variables pour le template */
  variables?: Record<string, string>;
  /** Message brut (si pas de template) */
  message?: string;
  /** Références pour le log */
  order_id?: string;
  service_order_id?: string;
  campaign_id?: string;
}

// Map sms_type → colonne de préférence dans sms_preferences
const PREF_COLUMN_MAP: Record<string, string> = {
  order_status: "order_status",
  shipping_alert: "shipping_alerts",
  service_order: "service_order_updates",
  wishlist_alert: "wishlist_alerts",
  promotional: "promotional",
  test: "sms_enabled", // test SMS only needs global toggle
};

Deno.serve(createHandler({
  name: "send-sms",
  auth: "none",
  rateLimit: { prefix: "send-sms", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, req }) => {

  // Accept authenticated user OR admin/service-role
  const { requireAuth, requireAdminOrSecret, isAuthError } = await import("../_shared/auth.ts");
  const authResult = await requireAuth(req, corsHeaders);
  if (isAuthError(authResult)) {
    const adminError = await requireAdminOrSecret(req, corsHeaders);
    if (adminError) return adminError;
  }

  const input = body as SendSmsRequest;

  if (!input.recipient_phone || !input.sms_type) {
    return jsonResponse(
      { success: false, error: "recipient_phone et sms_type sont requis" },
      400,
      corsHeaders,
    );
  }

  // 1. Validate phone number
  const phone = validateFrenchMobile(input.recipient_phone);
  if (!phone) {
    return jsonResponse(
      { success: false, error: "Numéro de mobile français invalide" },
      400,
      corsHeaders,
    );
  }

  // 2. Check user SMS preferences (if user_id provided)
  if (input.user_id && input.sms_type !== "test") {
    const prefColumn = PREF_COLUMN_MAP[input.sms_type];
    const { data: prefs } = await supabaseAdmin
      .from("sms_preferences")
      .select("sms_enabled, " + prefColumn)
      .eq("user_id", input.user_id)
      .single();

    if (!prefs || !prefs.sms_enabled || !prefs[prefColumn]) {
      return jsonResponse(
        { success: false, skipped: true, reason: "SMS non activé par l'utilisateur" },
        200,
        corsHeaders,
      );
    }
  }

  // 3. Load gateway config
  const config = await getSmsGatewayConfig(supabaseAdmin);
  if (!config) {
    console.error("[send-sms] Gateway SMS non configurée");
    return jsonResponse(
      { success: false, error: "Gateway SMS non configurée" },
      503,
      corsHeaders,
    );
  }

  // 4. Check daily rate limit per phone
  const { data: countResult } = await supabaseAdmin
    .rpc("increment_sms_daily_count", { p_phone: phone });

  const dailyCount = typeof countResult === "number" ? countResult : 1;
  if (dailyCount > config.dailyLimitPerPhone && input.sms_type !== "test") {
    // Log as rejected
    await supabaseAdmin.from("sms_logs").insert({
      recipient_phone: phone,
      user_id: input.user_id || null,
      sms_type: input.sms_type,
      message_text: "(rate limited)",
      status: "rejected",
      error_message: `Limite quotidienne atteinte (${config.dailyLimitPerPhone}/jour)`,
      order_id: input.order_id || null,
      service_order_id: input.service_order_id || null,
      campaign_id: input.campaign_id || null,
    });

    return jsonResponse(
      { success: false, error: "Limite quotidienne SMS atteinte pour ce numéro" },
      429,
      corsHeaders,
    );
  }

  // 5. Build message text
  let messageText = input.message || "";

  if (input.template_slug && !messageText) {
    const { data: template } = await supabaseAdmin
      .from("sms_templates")
      .select("body_template, is_active")
      .eq("slug", input.template_slug)
      .single();

    if (!template || !template.is_active) {
      return jsonResponse(
        { success: false, error: `Template '${input.template_slug}' introuvable ou désactivé` },
        404,
        corsHeaders,
      );
    }

    messageText = renderTemplate(template.body_template, input.variables || {});
  }

  if (!messageText) {
    return jsonResponse(
      { success: false, error: "Aucun message à envoyer (template ou message requis)" },
      400,
      corsHeaders,
    );
  }

  // 6. Send via gateway
  const result = await sendSmsViaGateway(config, phone, messageText);

  // 7. Log to sms_logs
  await supabaseAdmin.from("sms_logs").insert({
    recipient_phone: phone,
    user_id: input.user_id || null,
    sms_type: input.sms_type,
    message_text: messageText,
    gateway_message_id: result.messageId || null,
    status: result.success ? "sent" : "failed",
    error_message: result.error || null,
    gateway_response: result.gatewayResponse || null,
    sent_at: result.success ? new Date().toISOString() : null,
    order_id: input.order_id || null,
    service_order_id: input.service_order_id || null,
    campaign_id: input.campaign_id || null,
  });

  return jsonResponse(
    {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    },
    result.success ? 200 : 502,
    corsHeaders,
  );
}));
