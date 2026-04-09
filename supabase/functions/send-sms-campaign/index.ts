// ── send-sms-campaign : Envoi de campagnes SMS en masse ─────────────────────
//
// Admin-only. Envoie les SMS d'une campagne de manière cadencée
// (1 SMS toutes les 2 secondes) pour respecter les limites opérateur.

import { createHandler, jsonResponse } from "../_shared/handler.ts";
import {
  getSmsGatewayConfig,
  validateFrenchMobile,
  sendSmsViaGateway,
} from "../_shared/sms-client.ts";

interface CampaignRequest {
  campaign_id: string;
}

Deno.serve(createHandler({
  name: "send-sms-campaign",
  auth: "admin",
  rateLimit: { prefix: "sms-campaign", max: 5, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {

  const { campaign_id } = body as CampaignRequest;

  if (!campaign_id) {
    return jsonResponse({ error: "campaign_id requis" }, 400, corsHeaders);
  }

  // Load campaign
  const { data: campaign, error: campError } = await supabaseAdmin
    .from("sms_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campError || !campaign) {
    return jsonResponse({ error: "Campagne introuvable" }, 404, corsHeaders);
  }

  if (campaign.status !== "draft") {
    return jsonResponse(
      { error: `Campagne déjà ${campaign.status}, impossible de relancer` },
      409,
      corsHeaders,
    );
  }

  // Load gateway config
  const config = await getSmsGatewayConfig(supabaseAdmin);
  if (!config) {
    return jsonResponse({ error: "Gateway SMS non configurée" }, 503, corsHeaders);
  }

  // Build recipient list based on segment
  let phoneNumbers: string[] = [];

  if (campaign.target_segment === "custom" && campaign.custom_phone_numbers?.length) {
    phoneNumbers = campaign.custom_phone_numbers
      .map((p: string) => validateFrenchMobile(p))
      .filter(Boolean) as string[];
  } else {
    // Query opted-in users for promotional SMS
    const { data: prefs } = await supabaseAdmin
      .from("sms_preferences")
      .select("phone_number")
      .eq("sms_enabled", true)
      .eq("promotional", true)
      .not("phone_number", "is", null);

    phoneNumbers = (prefs || [])
      .map((p: { phone_number: string }) => validateFrenchMobile(p.phone_number))
      .filter(Boolean) as string[];
  }

  if (phoneNumbers.length === 0) {
    await supabaseAdmin
      .from("sms_campaigns")
      .update({ status: "completed", total_recipients: 0, completed_at: new Date().toISOString() })
      .eq("id", campaign_id);

    return jsonResponse({ success: true, sent: 0, message: "Aucun destinataire" }, 200, corsHeaders);
  }

  // Mark campaign as sending
  await supabaseAdmin
    .from("sms_campaigns")
    .update({
      status: "sending",
      total_recipients: phoneNumbers.length,
      started_at: new Date().toISOString(),
    })
    .eq("id", campaign_id);

  // Send SMS with 2-second stagger
  let sentCount = 0;
  let failedCount = 0;

  // Append STOP mention for promotional SMS (French regulation)
  const messageText = campaign.message_text.includes("STOP")
    ? campaign.message_text
    : campaign.message_text + " - STOP SMS: répondez STOP";

  for (const phone of phoneNumbers) {
    const result = await sendSmsViaGateway(config, phone, messageText);

    // Log each individual send
    await supabaseAdmin.from("sms_logs").insert({
      recipient_phone: phone,
      sms_type: "promotional",
      message_text: messageText,
      gateway_message_id: result.messageId || null,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
      gateway_response: result.gatewayResponse || null,
      sent_at: result.success ? new Date().toISOString() : null,
      campaign_id,
    });

    if (result.success) sentCount++;
    else failedCount++;

    // Update counters in real-time
    await supabaseAdmin
      .from("sms_campaigns")
      .update({ sent_count: sentCount, failed_count: failedCount })
      .eq("id", campaign_id);

    // Stagger: wait 2 seconds between sends (except for last one)
    if (phone !== phoneNumbers[phoneNumbers.length - 1]) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Mark campaign as completed
  await supabaseAdmin
    .from("sms_campaigns")
    .update({
      status: "completed",
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaign_id);

  return jsonResponse(
    { success: true, total: phoneNumbers.length, sent: sentCount, failed: failedCount },
    200,
    corsHeaders,
  );
}));
