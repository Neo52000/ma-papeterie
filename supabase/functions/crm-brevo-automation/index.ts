import { createHandler } from "../_shared/handler.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CRM Brevo Automation — Handles automated email sequences:
 * - Quote follow-up (5 days after sent)
 * - Dormant customer reactivation (at_risk/hibernating RFM segments)
 * - Welcome new customer (first order)
 * - `action: "enrol_prospects"` : pousse des prospects dans une liste Brevo et
 *   déclenche un workflow de prospection.
 */
Deno.serve(createHandler({
  name: "crm-brevo-automation",
  auth: "admin-or-secret",
  rateLimit: { prefix: "crm-brevo-auto", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body }) => {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) {
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const params = (body ?? {}) as { action?: string } & Record<string, unknown>;

  // ── Nouveau : enrôlement de prospects ──────────────────────────────────
  if (params.action === "enrol_prospects") {
    return await handleProspectEnrollment(supabaseAdmin, brevoApiKey, params);
  }

  // ── Legacy : cycles hebdomadaires (quote relance + dormant) ────────────
  return await handleLegacyAutomations(supabaseAdmin, brevoApiKey);
}));

// ─────────────────────────────────────────────────────────────────────────────
// Enrôlement de prospects dans une liste + workflow Brevo
// ─────────────────────────────────────────────────────────────────────────────

async function handleProspectEnrollment(
  supabase: SupabaseClient,
  brevoApiKey: string,
  params: Record<string, unknown>,
) {
  const campaignId = params.campaign_id as string | undefined;
  const prospectIds = params.prospect_ids as string[] | undefined;

  if (!campaignId || !Array.isArray(prospectIds) || prospectIds.length === 0) {
    return { success: false, error: "campaign_id et prospect_ids[] requis" };
  }

  // 1. Charger la campagne
  const { data: campaign, error: campaignErr } = await supabase
    .from("prospect_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (campaignErr || !campaign) {
    return { success: false, error: `Campagne introuvable : ${campaignErr?.message ?? campaignId}` };
  }
  if (!campaign.brevo_list_id) {
    return { success: false, error: "La campagne n'a pas de brevo_list_id configuré." };
  }

  // 2. Charger les prospects avec un email (les autres sont skippés avec warning)
  const { data: prospects, error: pErr } = await supabase
    .from("prospects")
    .select("id, name, siren, siret, contact_email, naf_code, client_segment, address")
    .in("id", prospectIds);
  if (pErr) {
    return { success: false, error: `DB: ${pErr.message}` };
  }

  const withEmail = (prospects ?? []).filter((p: { contact_email: string | null }) => !!p.contact_email);
  const withoutEmail = (prospects?.length ?? 0) - withEmail.length;

  let enrolled = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (const p of withEmail as Array<{
    id: string; name: string; siren: string; siret: string | null;
    contact_email: string; naf_code: string | null; client_segment: string | null;
    address: { dept?: string; city?: string } | null;
  }>) {
    try {
      // A. Upsert contact Brevo avec attributs prospect
      const contactRes = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: p.contact_email,
          attributes: {
            COMPANY_NAME: p.name,
            SIREN: p.siren,
            NAF: p.naf_code ?? "",
            PROSPECT_SEGMENT: p.client_segment ?? "pme",
            DEPT: p.address?.dept ?? "",
            CITY: p.address?.city ?? "",
          },
          listIds: [campaign.brevo_list_id],
          updateEnabled: true,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!contactRes.ok && contactRes.status !== 400) {
        // 400 souvent = déjà dans la liste, on continue
        errorMessages.push(`Brevo contact ${p.contact_email}: HTTP ${contactRes.status}`);
        errors++;
        continue;
      }

      // B. Upsert l'enrollment
      await supabase
        .from("prospect_enrollments")
        .upsert(
          {
            prospect_id: p.id,
            campaign_id: campaignId,
            enrolled_at: new Date().toISOString(),
            last_event: "enrolled",
            last_event_at: new Date().toISOString(),
          },
          { onConflict: "prospect_id,campaign_id" },
        );

      // C. Trigger workflow Brevo si fourni
      if (campaign.brevo_workflow_id) {
        try {
          await fetch("https://api.brevo.com/v3/automation/events", {
            method: "POST",
            headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "prospection_discovery",
              email: p.contact_email,
              properties: {
                campaign_id: campaignId,
                prospect_id: p.id,
                workflow_id: campaign.brevo_workflow_id,
              },
            }),
            signal: AbortSignal.timeout(10_000),
          });
        } catch (workflowErr) {
          // Non bloquant : l'enrôlement dans la liste déclenche déjà le workflow
          // si la liste est la trigger-list du workflow.
          console.warn(JSON.stringify({
            fn: "crm-brevo-automation",
            event: "workflow_trigger_failed",
            prospect_id: p.id,
            error: workflowErr instanceof Error ? workflowErr.message : String(workflowErr),
          }));
        }
      }

      // D. Log interaction prospect
      await supabase.from("prospect_interactions").insert({
        prospect_id: p.id,
        channel: "email",
        direction: "outbound",
        subject: `Enrôlement campagne ${campaign.name}`,
        description: `Ajouté à la liste Brevo #${campaign.brevo_list_id}`,
        metadata: {
          automation: "enrol_prospects",
          campaign_id: campaignId,
          brevo_list_id: campaign.brevo_list_id,
        },
      });

      enrolled++;
    } catch (err) {
      errors++;
      errorMessages.push(err instanceof Error ? err.message : String(err));
    }
  }

  // Activer la campagne si elle était en draft
  if (enrolled > 0 && campaign.status === "draft") {
    await supabase
      .from("prospect_campaigns")
      .update({ status: "active" })
      .eq("id", campaignId);
  }

  return {
    success: errors === 0,
    enrolled,
    errors,
    skipped_no_email: withoutEmail,
    error_messages: errorMessages.slice(0, 5),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy : quote follow-up + dormant reactivation (inchangé)
// ─────────────────────────────────────────────────────────────────────────────

async function handleLegacyAutomations(
  supabase: SupabaseClient,
  brevoApiKey: string,
) {
  const results = {
    quote_relance: 0,
    dormant_reactivation: 0,
    errors: 0,
  };

  // ── 1. Quote follow-up: sent > 5 days, not viewed/accepted/rejected ───
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pendingQuotes } = await supabase
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

        if (quote.profile_id) {
          await supabase.from("customer_interactions").insert({
            user_id: quote.profile_id,
            profile_id: quote.profile_id,
            interaction_type: "email_sent",
            channel: "email",
            subject: `Relance devis ${quote.quote_number}`,
            metadata: { quote_id: quote.id, automation: "quote_relance" },
            created_by: "00000000-0000-0000-0000-000000000000",
          });
        }

        await supabase.from("crm_tasks").insert({
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
    const { data: dormantProfiles } = await supabase
      .from("profiles")
      .select("id, user_id, display_name, rfm_segment, total_spent, brevo_synced_at")
      .in("rfm_segment", ["at_risk", "lost"])
      .or("brevo_synced_at.is.null,brevo_synced_at.lt." + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    for (const profile of dormantProfiles ?? []) {
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(profile.user_id);
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

        await supabase
          .from("profiles")
          .update({ brevo_synced_at: new Date().toISOString() })
          .eq("id", profile.id);

        await supabase.from("customer_interactions").insert({
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

  await supabase.from("cron_job_logs").insert({
    function_name: "crm-brevo-automation",
    status: results.errors === 0 ? "success" : "partial",
    details: JSON.stringify(results),
    executed_at: new Date().toISOString(),
  }).catch(() => {});

  return { success: true, ...results };
}
