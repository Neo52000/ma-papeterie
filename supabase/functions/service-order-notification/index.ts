import { createHandler, jsonResponse } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "service-order-notification",
  auth: "admin-or-secret",
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const { service_order_id } = (body ?? {}) as Record<string, string>;

  if (!service_order_id) {
    return jsonResponse({ error: "service_order_id required" }, 400, corsHeaders);
  }

  // Fetch order details
  const { data: order, error } = await supabaseAdmin
    .from("service_orders")
    .select("*, service_order_items(*)")
    .eq("id", service_order_id)
    .single();

  if (error || !order) {
    console.error("Order not found:", error);
    return jsonResponse({ error: "Order not found" }, 404, corsHeaders);
  }

  const adminEmail = Deno.env.get("ADMIN_EMAIL") || "contact@ma-papeterie.fr";
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!resendKey) {
    console.log("RESEND_API_KEY not set, skipping email notification");
    console.log(`Service order ${order.order_number} paid:`, {
      service_type: order.service_type,
      items_count: order.service_order_items?.length || 0,
      delivery_mode: order.delivery_mode,
      total_ttc: order.total_ttc,
      customer: order.customer_name,
      email: order.customer_email,
    });
    return { sent: false, reason: "no_api_key" };
  }

  const serviceLabel = order.service_type === "photo" ? "Tirage photo" : "Reprographie";
  const itemCount = order.service_order_items?.length || 0;

  const emailHtml = `
    <h2>Nouvelle commande service : ${order.order_number}</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:4px 8px;color:#666">Service</td><td style="padding:4px 8px;font-weight:bold">${serviceLabel}</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Fichiers</td><td style="padding:4px 8px">${itemCount} fichier(s)</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Mode</td><td style="padding:4px 8px">${order.delivery_mode === "pickup" ? "Retrait boutique" : "Livraison"}</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Client</td><td style="padding:4px 8px">${order.customer_name} (${order.customer_email})</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Total TTC</td><td style="padding:4px 8px;font-weight:bold;color:#2563eb">${Number(order.total_ttc).toFixed(2)} &euro;</td></tr>
    </table>
    <p style="margin-top:16px">
      <a href="https://ma-papeterie.fr/admin/print-orders" style="background:#2563eb;color:white;padding:8px 16px;border-radius:4px;text-decoration:none">
        Voir dans le dashboard
      </a>
    </p>
  `;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "Ma Papeterie <noreply@ma-papeterie.fr>",
      to: adminEmail,
      subject: `[Service] Nouvelle commande ${order.order_number} — ${serviceLabel}`,
      html: emailHtml,
    }),
  });

  const emailResult = await emailResponse.json();
  console.log("Admin notification sent:", emailResult);

  return { sent: true };
}));
