import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface InteractionInput {
  source: "shopify" | "brevo" | "manual";
  event_type: string;
  user_id?: string;
  profile_id?: string;
  email?: string;
  data: Record<string, unknown>;
}

Deno.serve(createHandler({
  name: "crm-interaction-logger",
  auth: "admin-or-secret",
  rateLimit: { prefix: "crm-log", max: 100, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const input = body as InteractionInput;

  if (!input.source || !input.event_type) {
    return jsonResponse(
      { error: "source et event_type sont requis" },
      400,
      corsHeaders,
    );
  }

  // Resolve profile_id from email if not provided
  let profileId = input.profile_id;
  let userId = input.user_id;

  if (!profileId && input.email) {
    // Try to find profile via auth user email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(
      (u: { email?: string }) => u.email === input.email,
    );
    if (authUser) {
      userId = authUser.id;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", authUser.id)
        .single();
      if (profile) profileId = profile.id;
    }
  }

  let interactionType: string;
  let channel: string;
  let subject: string;
  let description: string | null = null;
  const metadata: Record<string, unknown> = { ...input.data };

  // Map source + event to interaction fields
  switch (input.source) {
    case "shopify": {
      channel = "web";
      switch (input.event_type) {
        case "order_created":
          interactionType = "order";
          subject = `Commande ${input.data.order_number ?? ""} - ${input.data.total_amount ?? 0} EUR`;
          description = `Nouvelle commande via le site web`;
          break;
        case "order_fulfilled":
          interactionType = "order";
          subject = `Commande ${input.data.order_number ?? ""} expediee`;
          description = `Commande marquee comme expediee`;
          break;
        case "order_refunded":
          interactionType = "return";
          subject = `Remboursement commande ${input.data.order_number ?? ""}`;
          description = `Remboursement effectue`;
          break;
        default:
          interactionType = "note";
          subject = `Evenement Shopify: ${input.event_type}`;
      }
      break;
    }
    case "brevo": {
      channel = "email";
      switch (input.event_type) {
        case "email_opened":
          interactionType = "email_opened";
          subject = `Email ouvert: ${input.data.subject ?? ""}`;
          break;
        case "email_clicked":
          interactionType = "email_clicked";
          subject = `Clic dans email: ${input.data.subject ?? ""}`;
          description = `Lien clique: ${input.data.link ?? ""}`;
          break;
        case "email_bounced":
          interactionType = "email_bounced";
          subject = `Email rebondi: ${input.data.subject ?? ""}`;
          break;
        case "email_unsubscribed":
          interactionType = "email_unsubscribed";
          subject = `Desabonnement email`;
          break;
        default:
          interactionType = "email_sent";
          subject = `Evenement Brevo: ${input.event_type}`;
      }
      break;
    }
    case "manual":
    default: {
      interactionType = input.event_type;
      channel = (input.data.channel as string) ?? "web";
      subject = (input.data.subject as string) ?? `Interaction manuelle: ${input.event_type}`;
      description = (input.data.description as string) ?? null;
    }
  }

  // Insert interaction
  const { error: insertError } = await supabaseAdmin
    .from("customer_interactions")
    .insert({
      user_id: userId ?? "00000000-0000-0000-0000-000000000000",
      profile_id: profileId ?? null,
      interaction_type: interactionType,
      channel,
      subject,
      description,
      metadata,
      created_by: "00000000-0000-0000-0000-000000000000", // system
    });

  if (insertError) throw insertError;

  // Update engagement score for email events
  if (profileId && input.source === "brevo" && ["email_opened", "email_clicked"].includes(input.event_type)) {
    const increment = input.event_type === "email_clicked" ? 3 : 1;
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("engagement_score")
      .eq("id", profileId)
      .single();

    if (currentProfile) {
      const newScore = Math.min(100, (currentProfile.engagement_score ?? 0) + increment);
      await supabaseAdmin
        .from("profiles")
        .update({ engagement_score: newScore })
        .eq("id", profileId);
    }
  }

  // Update profile stats for order events
  if (profileId && input.source === "shopify" && input.event_type === "order_created") {
    const totalAmount = Number(input.data.total_amount ?? 0);
    if (totalAmount > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("total_orders, total_spent, first_order_at")
        .eq("id", profileId)
        .single();

      if (profile) {
        const newTotalOrders = (profile.total_orders ?? 0) + 1;
        const newTotalSpent = (profile.total_spent ?? 0) + totalAmount;
        await supabaseAdmin
          .from("profiles")
          .update({
            total_orders: newTotalOrders,
            total_spent: newTotalSpent,
            last_order_at: new Date().toISOString(),
            first_order_at: profile.first_order_at ?? new Date().toISOString(),
            avg_basket: Math.round((newTotalSpent / newTotalOrders) * 100) / 100,
          })
          .eq("id", profileId);
      }
    }
  }

  return { success: true, interaction_type: interactionType, profile_id: profileId };
}));
