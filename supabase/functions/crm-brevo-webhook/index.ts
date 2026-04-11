import { createHandler } from "../_shared/handler.ts";

/**
 * Brevo webhook handler — receives email tracking events
 * Events: delivered, opened, clicked, soft_bounce, hard_bounce, unsubscribed
 */
Deno.serve(createHandler({
  name: "crm-brevo-webhook",
  auth: "secret",
  rateLimit: { prefix: "crm-brevo-wh", max: 200, windowMs: 60_000 },
}, async ({ supabaseAdmin, body }) => {
  const event = body as {
    event: string;
    email: string;
    subject?: string;
    link?: string;
    "message-id"?: string;
    ts_event?: number;
    tag?: string;
  };

  if (!event.event || !event.email) {
    return { success: false, error: "Missing event or email" };
  }

  // Resolve profile from email
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(
    (u: { email?: string }) => u.email === event.email,
  );

  let userId: string | null = null;
  let profileId: string | null = null;

  if (authUser) {
    userId = authUser.id;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", authUser.id)
      .single();
    if (profile) profileId = profile.id;
  }

  // Map Brevo event to interaction type
  const eventMap: Record<string, string> = {
    delivered: "email_delivered",
    opened: "email_opened",
    click: "email_clicked",
    soft_bounce: "email_bounced",
    hard_bounce: "email_bounced",
    unsubscribed: "email_unsubscribed",
    spam: "email_spam",
  };

  const interactionType = eventMap[event.event] ?? `email_${event.event}`;

  // Log interaction
  if (userId) {
    await supabaseAdmin.from("customer_interactions").insert({
      user_id: userId,
      profile_id: profileId,
      interaction_type: interactionType,
      channel: "email",
      subject: event.subject
        ? `${interactionType === "email_opened" ? "Ouverture" : "Evenement"}: ${event.subject}`
        : `Brevo ${event.event}`,
      description: event.link ? `Lien clique: ${event.link}` : null,
      metadata: {
        brevo_event: event.event,
        message_id: event["message-id"],
        tag: event.tag,
        link: event.link,
        ts_event: event.ts_event,
      },
      created_by: "00000000-0000-0000-0000-000000000000",
    });
  }

  // Update engagement score
  if (profileId) {
    const scoreIncrement: Record<string, number> = {
      opened: 1,
      click: 3,
      unsubscribed: -10,
      spam: -20,
    };

    const increment = scoreIncrement[event.event];
    if (increment !== undefined) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("engagement_score")
        .eq("id", profileId)
        .single();

      if (profile) {
        const newScore = Math.max(0, Math.min(100, (profile.engagement_score ?? 0) + increment));
        await supabaseAdmin
          .from("profiles")
          .update({ engagement_score: newScore })
          .eq("id", profileId);
      }
    }
  }

  return { success: true, event: event.event, profile_id: profileId };
}));
