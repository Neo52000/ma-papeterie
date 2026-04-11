import { createHandler } from "../_shared/handler.ts";

/**
 * CRM Brevo Automation — Handles automated email sequences:
 * - Quote follow-up (5 days after sent)
 * - Dormant customer reactivation (at_risk/hibernating RFM segments)
 * - Welcome new customer (first order)
 */
Deno.serve(createHandler({
  name: "crm-brevo-automation",
  auth: "admin-or-secret",
  rateLimit: { prefix: "crm-brevo-auto", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin }) => {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) {
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const results = {
    quote_relance: 0,
    dormant_reactivation: 0,
    errors: 0,
  };

  // ── 1. Quote follow-up: sent > 5 days, not viewed/accepted/rejected ───
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pendingQuotes } = await supabaseAdmin
    .from("quotes")
    .select("id, quote_number, contact_name, contact_email, total_ttc, profile_id, pdf_url")
    .eq("status", "sent")
    .lt("sent_at", fiveDaysAgo)
    .limit(20);

  const templateRelance = parseInt(Deno.env.get("BREVO_TEMPLATE_QUOTE_RELANCE") ?? "0");

  for (const quote of pendingQuotes ?? []) {
    try {
      if (templateRelance && quote.contact_email) {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateRelance,
            to: [{ email: quote.contact_email, name: quote.contact_name }],
            params: {
              PRENOM: quote.contact_name.split(" ")[0],
              QUOTE_NUMBER: quote.quote_number,
              TOTAL_TTC: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(quote.total_ttc),
              PDF_URL: quote.pdf_url ?? "",
            },
            sender: { name: "Ma Papeterie", email: "contact@ma-papeterie.fr" },
            replyTo: { name: "Elie — Ma Papeterie", email: "contact@ma-papeterie.fr" },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        // Log interaction
        if (quote.profile_id) {
          await supabaseAdmin.from("customer_interactions").insert({
            user_id: quote.profile_id,
            profile_id: quote.profile_id,
            interaction_type: "email_sent",
            channel: "email",
            subject: `Relance devis ${quote.quote_number}`,
            metadata: { quote_id: quote.id, automation: "quote_relance" },
            created_by: "00000000-0000-0000-0000-000000000000",
          });
        }

        // Create follow-up task
        await supabaseAdmin.from("crm_tasks").insert({
          profile_id: quote.profile_id ?? null,
          quote_id: quote.id,
          type: "follow_up",
          title: `Relancer devis ${quote.quote_number} par telephone`,
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          priority: "high",
        });

        results.quote_relance++;
      }
    } catch (err) {
      console.error(`[crm-brevo-automation] Quote relance error for ${quote.id}:`, err);
      results.errors++;
    }
  }

  // ── 2. Dormant customer reactivation ──────────────────────────────────
  const templateDormant = parseInt(Deno.env.get("BREVO_TEMPLATE_DORMANT_CUSTOMER") ?? "0");

  if (templateDormant) {
    const { data: dormantProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, display_name, rfm_segment, total_spent, brevo_synced_at")
      .in("rfm_segment", ["at_risk", "lost"])
      .or("brevo_synced_at.is.null,brevo_synced_at.lt." + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    for (const profile of dormantProfiles ?? []) {
      try {
        // Get email from auth user
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        const email = authData?.user?.email;
        if (!email) continue;

        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: templateDormant,
            to: [{ email, name: profile.display_name ?? "Client" }],
            params: {
              PRENOM: (profile.display_name ?? "Client").split(" ")[0],
              SEGMENT: profile.rfm_segment,
            },
            sender: { name: "Ma Papeterie", email: "contact@ma-papeterie.fr" },
            replyTo: { name: "Elie — Ma Papeterie", email: "contact@ma-papeterie.fr" },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        // Mark as synced
        await supabaseAdmin
          .from("profiles")
          .update({ brevo_synced_at: new Date().toISOString() })
          .eq("id", profile.id);

        // Log interaction
        await supabaseAdmin.from("customer_interactions").insert({
          user_id: profile.user_id,
          profile_id: profile.id,
          interaction_type: "email_sent",
          channel: "email",
          subject: `Email reactivation client ${profile.rfm_segment}`,
          metadata: { automation: "dormant_reactivation", segment: profile.rfm_segment },
          created_by: "00000000-0000-0000-0000-000000000000",
        });

        results.dormant_reactivation++;
      } catch (err) {
        console.error(`[crm-brevo-automation] Dormant reactivation error for ${profile.id}:`, err);
        results.errors++;
      }
    }
  }

  // Log execution
  await supabaseAdmin.from("cron_job_logs").insert({
    function_name: "crm-brevo-automation",
    status: results.errors === 0 ? "success" : "partial",
    details: JSON.stringify(results),
    executed_at: new Date().toISOString(),
  }).catch(() => {});

  return { success: true, ...results };
}));
