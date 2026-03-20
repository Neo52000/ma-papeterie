import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAuth, isAuthError } from "../_shared/auth.ts";

interface ServiceCheckoutRequest {
  service_order_id: string;
  order_number: string;
}

const handler = async (req: Request): Promise<Response> => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);
  const headers = { "Content-Type": "application/json", ...corsHeaders };

  try {
    const authResult = await requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult.error;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe n'est pas configuré" }),
        { status: 500, headers },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body: ServiceCheckoutRequest = await req.json();
    const { service_order_id, order_number } = body;

    if (!service_order_id || !order_number) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants" }),
        { status: 400, headers },
      );
    }

    // Fetch order with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("service_orders")
      .select("*")
      .eq("id", service_order_id)
      .eq("user_id", authResult.userId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Commande introuvable" }),
        { status: 404, headers },
      );
    }

    // Fetch items
    const { data: items } = await supabaseAdmin
      .from("service_order_items")
      .select("*")
      .eq("order_id", service_order_id);

    // Build Stripe line items
    const serviceLabel = order.service_type === "reprographie"
      ? "Reprographie"
      : "Développement photo";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (order.service_type === "reprographie") {
      // Single line item for reprographie
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
      // Photo: one line per item
      for (const item of (items || [])) {
        const ttcUnit = Math.round(item.unit_price_ht * 1.20 * 100) / 100;
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

    // Add shipping if applicable
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: order.customer_email,
      line_items: lineItems,
      metadata: {
        service_order_id: order.id,
        order_number: order.order_number,
        service_type: order.service_type,
        user_id: authResult.userId,
      },
      success_url: `${siteUrl}/services/${order.service_type === "reprographie" ? "reprographie" : "developpement-photo"}?session_id={CHECKOUT_SESSION_ID}&order_number=${order.order_number}`,
      cancel_url: `${siteUrl}/services/${order.service_type === "reprographie" ? "reprographie" : "developpement-photo"}?cancelled=true`,
    });

    // Store Stripe session ID
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

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        sessionUrl: session.url,
        orderNumber: order.order_number,
      }),
      { status: 200, headers },
    );
  } catch (error: unknown) {
    console.error("create-service-checkout error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers },
    );
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendAdminNotification(
  supabase: any,
  order: any,
  items: any[],
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not set — skipping admin notification");
    return;
  }

  const serviceLabel = order.service_type === "reprographie"
    ? "Reprographie"
    : "Développement photo";

  const deliveryLabel = order.delivery_mode === "pickup"
    ? "Retrait en boutique"
    : "Livraison à domicile";

  const itemsHtml = items.map((it: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.file_name)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${it.format || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
    </tr>
  `).join("");

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

serve(handler);
