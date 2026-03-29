// ── Brevo CRM — Sync Contact ────────────────────────────────────────────────
//
// Upsert un contact dans Brevo avec les attributs client agrégés.
// Appelé en fire-and-forget après confirmation de commande.

import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface SyncContactBody {
  order_id: string;
}

Deno.serve(
  createHandler(
    {
      name: "brevo-sync-contact",
      auth: "admin-or-secret",
      rateLimit: { prefix: "brevo-sync", max: 30, windowMs: 60_000 },
    },
    async ({ supabaseAdmin, body, corsHeaders }) => {
      const { order_id } = body as SyncContactBody;

      if (!order_id) {
        return jsonResponse({ error: "order_id requis" }, 400, corsHeaders);
      }

      // ── 1. Fetch order ──────────────────────────────────────────────────
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select("id, user_id, customer_email, total_amount, status, created_at")
        .eq("id", order_id)
        .single();

      if (orderErr || !order) {
        console.error("Order not found:", order_id, orderErr);
        return jsonResponse({ error: "Commande introuvable" }, 404, corsHeaders);
      }

      const email = order.customer_email;
      if (!email) {
        await logSync(supabaseAdmin, {
          event_type: "contact_sync",
          customer_email: "",
          order_id,
          status: "skipped",
          error_message: "Pas d'email client sur la commande",
        });
        return { success: false, reason: "no_email" };
      }

      // ── 2. Fetch profile display_name → PRENOM / NOM ───────────────────
      let prenom = "";
      let nom = "";

      if (order.user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("user_id", order.user_id)
          .maybeSingle();

        const displayName = profile?.display_name ?? "";
        const spaceIdx = displayName.indexOf(" ");
        if (spaceIdx > 0) {
          prenom = displayName.slice(0, spaceIdx);
          nom = displayName.slice(spaceIdx + 1);
        } else {
          prenom = displayName;
        }
      }

      // ── 3. Aggregate confirmed orders stats ─────────────────────────────
      const { data: confirmedOrders } = await supabaseAdmin
        .from("orders")
        .select("id, total_amount")
        .eq("customer_email", email)
        .in("status", ["confirmed", "preparing", "shipped", "delivered"]);

      const nbCommandes = confirmedOrders?.length ?? 0;
      const montantTotal = confirmedOrders?.reduce(
        (sum, o) => sum + (o.total_amount ?? 0),
        0,
      ) ?? 0;

      // ── 4. Brevo API — upsert contact ──────────────────────────────────
      const brevoApiKey = Deno.env.get("BREVO_API_KEY") ?? "";
      const listId = Number(Deno.env.get("BREVO_LIST_ID_CLIENTS") ?? "0");

      if (!brevoApiKey) {
        console.log("BREVO_API_KEY not configured — contact sync disabled");
        await logSync(supabaseAdmin, {
          event_type: "contact_sync",
          customer_email: email,
          order_id,
          status: "skipped",
          error_message: "BREVO_API_KEY non configurée",
        });
        return { success: false, reason: "no_api_key" };
      }

      const brevoPayload = {
        attributes: {
          PRENOM: prenom,
          NOM: nom,
          DERNIER_ACHAT: order.created_at,
          NB_COMMANDES: nbCommandes,
          MONTANT_TOTAL_TTC: Math.round(montantTotal * 100) / 100,
        },
        ...(listId > 0 ? { listIds: [listId] } : {}),
        updateEnabled: true,
      };

      try {
        const brevoRes = await fetch(
          `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
          {
            method: "PUT",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(brevoPayload),
          },
        );

        const brevoBody = brevoRes.ok
          ? await brevoRes.text().then((t) => (t ? JSON.parse(t) : {}))
          : await brevoRes.json().catch(() => ({}));

        if (!brevoRes.ok) {
          console.error("Brevo API error:", brevoRes.status, brevoBody);
          await logSync(supabaseAdmin, {
            event_type: "contact_sync",
            customer_email: email,
            order_id,
            status: "error",
            brevo_response: brevoBody,
            error_message: `Brevo ${brevoRes.status}: ${brevoBody?.message ?? "unknown"}`,
          });
          // Return success to caller — never block the checkout
          return { success: false, brevo_status: brevoRes.status, email };
        }

        await logSync(supabaseAdmin, {
          event_type: "contact_sync",
          customer_email: email,
          order_id,
          status: "success",
          brevo_response: brevoBody,
        });

        return {
          success: true,
          email,
          nb_commandes: nbCommandes,
          montant_total: montantTotal,
        };
      } catch (err) {
        console.error("Brevo sync fetch error:", err);
        await logSync(supabaseAdmin, {
          event_type: "contact_sync",
          customer_email: email,
          order_id,
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
  order_id: string;
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
