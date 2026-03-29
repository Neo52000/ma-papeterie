// ── Brevo CRM — Send Transactional Email ────────────────────────────────────
//
// Envoie un email transactionnel via un template Brevo.
// Appelé en fire-and-forget après confirmation de commande.

import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface TransactionalBody {
  to_email: string;
  to_name?: string;
  template_id?: number;
  params: {
    ORDER_ID: string;
    PRENOM?: string;
    MONTANT_TTC: number;
    LIEN_SUIVI?: string;
  };
  order_id?: string;
}

Deno.serve(
  createHandler(
    {
      name: "brevo-send-transactional",
      auth: "admin-or-secret",
      rateLimit: { prefix: "brevo-email", max: 20, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body, corsHeaders }) => {
      const {
        to_email,
        to_name,
        template_id,
        params,
        order_id,
      } = body as TransactionalBody;

      if (!to_email || !params?.ORDER_ID) {
        return jsonResponse(
          { error: "to_email et params.ORDER_ID requis" },
          400,
          corsHeaders,
        );
      }

      const brevoApiKey = Deno.env.get("BREVO_API_KEY") ?? "";
      const defaultTemplateId = Number(
        Deno.env.get("BREVO_TEMPLATE_ORDER_CONFIRM") ?? "0",
      );
      const templateId = template_id ?? defaultTemplateId;

      if (!brevoApiKey) {
        console.log(
          "BREVO_API_KEY not configured — transactional email disabled",
        );
        await logSync(supabaseAdmin, {
          event_type: "transactional_email",
          customer_email: to_email,
          order_id: order_id ?? null,
          status: "skipped",
          error_message: "BREVO_API_KEY non configurée",
        });
        return { success: false, reason: "no_api_key" };
      }

      if (!templateId) {
        console.log("BREVO_TEMPLATE_ORDER_CONFIRM not configured");
        await logSync(supabaseAdmin, {
          event_type: "transactional_email",
          customer_email: to_email,
          order_id: order_id ?? null,
          status: "skipped",
          error_message: "Template ID non configuré",
        });
        return { success: false, reason: "no_template_id" };
      }

      // ── Brevo API — send transactional email ──────────────────────────
      const brevoPayload = {
        to: [{ email: to_email, name: to_name ?? "" }],
        templateId,
        params: {
          ORDER_ID: params.ORDER_ID,
          PRENOM: params.PRENOM ?? "",
          MONTANT_TTC: params.MONTANT_TTC.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          }),
          LIEN_SUIVI:
            params.LIEN_SUIVI ??
            `https://ma-papeterie.fr/orders/${params.ORDER_ID}`,
        },
      };

      try {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(brevoPayload),
        });

        const brevoBody = await brevoRes.json().catch(() => ({}));

        if (!brevoRes.ok) {
          console.error("Brevo email error:", brevoRes.status, brevoBody);
          await logSync(supabaseAdmin, {
            event_type: "transactional_email",
            customer_email: to_email,
            order_id: order_id ?? null,
            status: "error",
            brevo_response: brevoBody,
            error_message: `Brevo ${brevoRes.status}: ${brevoBody?.message ?? "unknown"}`,
          });
          return { success: false, brevo_status: brevoRes.status };
        }

        await logSync(supabaseAdmin, {
          event_type: "transactional_email",
          customer_email: to_email,
          order_id: order_id ?? null,
          status: "success",
          brevo_response: brevoBody,
        });

        return {
          success: true,
          messageId: brevoBody.messageId ?? null,
        };
      } catch (err) {
        console.error("Brevo email fetch error:", err);
        await logSync(supabaseAdmin, {
          event_type: "transactional_email",
          customer_email: to_email,
          order_id: order_id ?? null,
          status: "error",
          error_message: String(err),
        });
        return { success: false, error: "brevo_fetch_failed" };
      }
    },
  ),
);

// ── Helper — insert log row ─────────────────────────────────────────────────

interface LogEntry {
  event_type: string;
  customer_email: string;
  order_id: string | null;
  status: string;
  brevo_response?: unknown;
  error_message?: string;
}

async function logSync(
  supabaseAdmin: Parameters<Parameters<typeof createHandler>[1]>[0]["supabaseAdmin"],
  entry: LogEntry,
) {
  const { error } = await supabaseAdmin.from("brevo_sync_logs").insert(entry);
  if (error) console.error("Failed to insert brevo_sync_logs:", error);
}
