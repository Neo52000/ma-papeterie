import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { escapeHtml } from "../_shared/html.ts";

const TVA_RATE = 0.20;

interface ServiceCheckoutRequest {
  service_order_id: string;
  order_number: string;
}

Deno.serve(createHandler({
  name: "create-service-checkout",
  auth: "auth",
  rateLimit: { prefix: "service-checkout", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, userId }) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return jsonResponse({ error: "Stripe n'est pas configuré" }, 500, corsHeaders);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  const { service_order_id, order_number } = body as ServiceCheckoutRequest;

  if (!service_order_id || !order_number) {
    return jsonResponse({ error: "Champs requis manquants" }, 400, corsHeaders);
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("service_orders")
    .select("*")
    .eq("id", service_order_id)
    .eq("user_id", userId!)
    .single();

  if (orderError || !order) {
    return jsonResponse({ error: "Commande introuvable" }, 404, corsHeaders);
  }

  const { data: items } = await supabaseAdmin
    .from("service_order_items")
    .select("*")
    .eq("order_id", service_order_id);

  // Build Stripe line items
  const serviceLabel =
    order.service_type === "reprographie" ? "Reprographie" : "Développement photo";

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (order.service_type === "reprographie") {
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: {
          name: `${serviceLabel} — ${order.print_format} ${order.print_color === "couleur" ? "Couleur" : "N&B"}${order.recto_verso ? " R/V" : ""}`,
        },
        unit_amount: Math.round(order.total_ttc * 100 - (order.shipping_cost || 0) * 100),
      },
      quantity: 1,
    });
  } else {
    for (const item of items || []) {
      const ttcUnit = Math.round(item.unit_price_ht * (1 + TVA_RATE) * 100) / 100;
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `Tirage ${item.format || ""} — ${item.file_name}`,
          },
          unit_amount: Math.round(ttcUnit * 100),
        },
        quantity: item.quantity,
      });
    }
  }

  if (order.shipping_cost > 0) {
    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: { name: "Frais de livraison" },
        unit_amount: Math.round(order.shipping_cost * 100),
      },
      quantity: 1,
    });
  }

  const siteUrl = Deno.env.get("SITE_URL") || "https://ma-papeterie.fr";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: order.customer_email,
    line_items: lineItems,
    metadata: {
      service_order_id: order.id,
      order_number: order.order_number,
      service_type: order.service_type,
      user_id: userId!,
    },
    success_url: `${siteUrl}/services/${order.service_type === "reprographie" ? "reprographie" : "developpement-photo"}?session_id={CHECKOUT_SESSION_ID}&order_number=${order.order_number}`,
    cancel_url: `${siteUrl}/services/${order.service_type === "reprographie" ? "reprographie" : "developpement-photo"}?cancelled=true`,
  });

  await supabaseAdmin
    .from("service_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", service_order_id);

  // Send admin notification (fire and forget)
  try {
    await sendAdminNotification(supabaseAdmin, order, items || []);
  } catch (e) {
    console.error("Admin notification failed (non-blocking):", e);
  }

  return {
    sessionId: session.id,
    sessionUrl: session.url,
    orderNumber: order.order_number,
  };
}));

async function sendAdminNotification(supabase: any, order: any, items: any[]) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not set — skipping admin notification");
    return;
  }

  const serviceLabel =
    order.service_type === "reprographie" ? "Reprographie" : "Développement photo";
  const deliveryLabel =
    order.delivery_mode === "pickup" ? "Retrait en boutique" : "Livraison à domicile";

  const itemsHtml = items
    .map(
      (it: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.file_name)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${it.format || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <h2>Nouvelle commande service : ${escapeHtml(order.order_number)}</h2>
    <p><strong>Type :</strong> ${serviceLabel}</p>
    <p><strong>Client :</strong> ${escapeHtml(order.customer_email)}</p>
    <p><strong>Livraison :</strong> ${deliveryLabel}</p>
    <p><strong>Total TTC :</strong> ${Number(order.total_ttc).toFixed(2)} &euro;</p>
    ${order.notes ? `<p><strong>Notes :</strong> ${escapeHtml(order.notes)}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f3f4f6;">
        <th style="padding:8px;text-align:left;">Fichier</th>
        <th style="padding:8px;text-align:left;">Format</th>
        <th style="padding:8px;text-align:center;">Qté</th>
      </tr>
      ${itemsHtml}
    </table>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ma Papeterie <notifications@resend.dev>",
      to: ["commandes@ma-papeterie.fr"],
      subject: `[Service] Nouvelle commande ${serviceLabel} — ${order.order_number}`,
      html,
    }),
  });
}
