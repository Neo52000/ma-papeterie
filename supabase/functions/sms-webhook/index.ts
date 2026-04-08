// ── sms-webhook : Réception des statuts de livraison SMS ────────────────────
//
// Reçoit les webhooks de l'Android SMS Gateway pour mettre à jour
// le statut de livraison dans sms_logs.
// Events: sms:sent, sms:delivered, sms:failed

import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface WebhookPayload {
  event: string;
  payload: {
    messageId?: string;
    message?: string;
    phoneNumber?: string;
    error?: string;
    [key: string]: unknown;
  };
}

const EVENT_STATUS_MAP: Record<string, string> = {
  "sms:sent": "sent",
  "sms:delivered": "delivered",
  "sms:failed": "failed",
};

Deno.serve(createHandler({
  name: "sms-webhook",
  auth: "none",
  rateLimit: { prefix: "sms-webhook", max: 60, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, req }) => {

  // Validate webhook secret
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || req.headers.get("x-webhook-secret");

  const { data: secretRow } = await supabaseAdmin
    .from("admin_secrets")
    .select("value")
    .eq("key", "SMS_WEBHOOK_SECRET")
    .single();

  if (!secretRow || !secret || secret !== secretRow.value) {
    return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const webhook = body as WebhookPayload;

  if (!webhook.event || !webhook.payload) {
    return jsonResponse({ error: "Invalid webhook payload" }, 400, corsHeaders);
  }

  const newStatus = EVENT_STATUS_MAP[webhook.event];
  if (!newStatus) {
    // Unknown event — acknowledge but don't process
    return jsonResponse({ ok: true, ignored: true }, 200, corsHeaders);
  }

  const messageId = webhook.payload.messageId;
  if (!messageId) {
    return jsonResponse({ error: "Missing messageId" }, 400, corsHeaders);
  }

  // Update sms_logs
  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "delivered") {
    updateData.delivered_at = new Date().toISOString();
  }
  if (newStatus === "failed" && webhook.payload.error) {
    updateData.error_message = webhook.payload.error;
  }

  const { data: logRow } = await supabaseAdmin
    .from("sms_logs")
    .update(updateData)
    .eq("gateway_message_id", messageId)
    .select("campaign_id")
    .single();

  // Update campaign counters if applicable
  if (logRow?.campaign_id) {
    const counterColumn = newStatus === "delivered"
      ? "delivered_count"
      : newStatus === "failed"
        ? "failed_count"
        : null;

    if (counterColumn) {
      // Atomic increment via RPC-style update
      const { data: campaign } = await supabaseAdmin
        .from("sms_campaigns")
        .select(counterColumn)
        .eq("id", logRow.campaign_id)
        .single();

      if (campaign) {
        await supabaseAdmin
          .from("sms_campaigns")
          .update({ [counterColumn]: (campaign[counterColumn] || 0) + 1 })
          .eq("id", logRow.campaign_id);
      }
    }
  }

  return jsonResponse({ ok: true, status: newStatus }, 200, corsHeaders);
}));
