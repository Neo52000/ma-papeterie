import { createHandler } from "../_shared/handler.ts";

/**
 * Brevo webhook handler — receives email tracking events
 * Events: delivered, opened, clicked (alias "click"), soft_bounce, hard_bounce, unsubscribed
 *
 * Gère à la fois :
 *   - les comptes clients (profiles/customer_interactions)
 *   - les prospects (prospect_enrollments + prospect_interactions)
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

  // Map Brevo event to interaction type + enrollment event
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
  const enrollmentEvent = mapEnrollmentEvent(event.event);

  // 1. Résoudre un prospect par email (priorité : un prospect n'a pas de auth.users)
  const { data: prospectMatch } = await supabaseAdmin
    .from("prospects")
    .select("id")
    .eq("contact_email", event.email)
    .maybeSingle();

  if (prospectMatch) {
    await handleProspectEvent(supabaseAdmin, prospectMatch.id, event, interactionType, enrollmentEvent);
    return { success: true, event: event.event, prospect_id: prospectMatch.id };
  }

  // 2. Sinon : résoudre un utilisateur authentifié
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(
    (u: { email?: string }) => u.email === event.email,
  );

  if (!authUser) {
    // Email inconnu (ni prospect ni user) : on log en minimal
    return { success: true, event: event.event, note: "Email not found in prospects or users" };
  }

  const userId = authUser.id;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();
  const profileId = profile?.id ?? null;

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

  // Engagement score delta
  if (profileId) {
    const scoreIncrement: Record<string, number> = {
      opened: 1, click: 3, unsubscribed: -10, spam: -20,
    };
    const increment = scoreIncrement[event.event];
    if (increment !== undefined) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("engagement_score")
        .eq("id", profileId)
        .single();
      if (p) {
        const newScore = Math.max(0, Math.min(100, (p.engagement_score ?? 0) + increment));
        await supabaseAdmin
          .from("profiles")
          .update({ engagement_score: newScore })
          .eq("id", profileId);
      }
    }
  }

  return { success: true, event: event.event, profile_id: profileId };
}));

// ─────────────────────────────────────────────────────────────────────────────
// Prospect event handler
// ─────────────────────────────────────────────────────────────────────────────

function mapEnrollmentEvent(brevoEvent: string): string | null {
  switch (brevoEvent) {
    case "delivered":   return "delivered";
    case "opened":      return "opened";
    case "click":       return "clicked";
    case "unsubscribed": return "unsub";
    case "soft_bounce":
    case "hard_bounce": return "bounce";
    case "spam":        return "spam";
    default:            return null;
  }
}

interface BrevoEvent {
  event: string;
  email: string;
  subject?: string;
  link?: string;
  "message-id"?: string;
  ts_event?: number;
  tag?: string;
}

// deno-lint-ignore no-explicit-any
async function handleProspectEvent(
  supabase: any,
  prospectId: string,
  event: BrevoEvent,
  interactionType: string,
  enrollmentEvent: string | null,
) {
  // 1. Log interaction
  await supabase.from("prospect_interactions").insert({
    prospect_id: prospectId,
    channel: "email",
    direction: event.event === "click" || event.event === "opened" ? "inbound" : "outbound",
    subject: event.subject ?? `Brevo ${event.event}`,
    description: event.link ? `Lien cliqué: ${event.link}` : null,
    metadata: {
      brevo_event: event.event,
      message_id: event["message-id"],
      tag: event.tag,
      ts_event: event.ts_event,
    },
  });

  // 2. Mise à jour enrollments actifs (toutes les campagnes concernées)
  if (enrollmentEvent) {
    const updates: Record<string, unknown> = {
      last_event: enrollmentEvent,
      last_event_at: new Date().toISOString(),
    };
    if (event.event === "unsubscribed") {
      updates.unsubscribed_at = new Date().toISOString();
    }
    if (event.event === "hard_bounce" || event.event === "soft_bounce") {
      updates.bounced_at = new Date().toISOString();
    }
    await supabase
      .from("prospect_enrollments")
      .update(updates)
      .eq("prospect_id", prospectId)
      .is("unsubscribed_at", null);
  }

  // 3. Remonter le statut prospect si clic ou reply
  if (event.event === "click") {
    await supabase
      .from("prospects")
      .update({ status: "engaged" })
      .eq("id", prospectId)
      .in("status", ["new", "qualified", "contacted"]);
  }

  // 4. Tag l'interaction si unsubscribed ou bounce
  if (event.event === "unsubscribed") {
    const { data: current } = await supabase
      .from("prospects")
      .select("tags, status")
      .eq("id", prospectId)
      .single();
    if (current) {
      const tags = Array.from(new Set([...(current.tags ?? []), "unsubscribed"]));
      await supabase
        .from("prospects")
        .update({
          tags,
          status: current.status === "converted" ? current.status : "rejected",
        })
        .eq("id", prospectId);
    }
  }

  // Log console pour debug
  console.log(JSON.stringify({
    fn: "crm-brevo-webhook",
    event: "prospect_webhook_processed",
    prospect_id: prospectId,
    brevo_event: event.event,
    interaction_type: interactionType,
  }));
}
