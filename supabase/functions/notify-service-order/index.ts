import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { escapeHtml } from "../_shared/html.ts";

Deno.serve(createHandler({
  name: "notify-service-order",
  auth: "admin-or-secret",
  rateLimit: { prefix: "notify-service", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders }) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { success: false, message: "Email not configured" };
  }

  const { service_order_id } = (body ?? {}) as Record<string, string>;
  if (!service_order_id) {
    return jsonResponse({ error: "service_order_id requis" }, 400, corsHeaders);
  }

  const { data: order, error } = await supabaseAdmin
    .from("service_orders")
    .select("*")
    .eq("id", service_order_id)
    .single();

  if (error || !order) {
    return jsonResponse({ error: "Commande introuvable" }, 404, corsHeaders);
  }

  const { data: items } = await supabaseAdmin
    .from("service_order_items")
    .select("*")
    .eq("order_id", service_order_id);

  const serviceLabel = order.service_type === "reprographie"
    ? "Reprographie"
    : "Développement photo";

  const deliveryLabel = order.delivery_mode === "pickup"
    ? "Retrait en boutique"
    : "Livraison à domicile";

  const itemsHtml = (items || []).map((it: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.file_name)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${it.format || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:sans-serif;margin:0;padding:20px;background:#f9fafb;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
          <h2 style="color:#1f2937;">Nouvelle commande service</h2>
          <p><strong>N° :</strong> ${escapeHtml(order.order_number)}</p>
          <p><strong>Type :</strong> ${serviceLabel}</p>
          <p><strong>Client :</strong> ${escapeHtml(order.customer_email)}</p>
          <p><strong>Livraison :</strong> ${deliveryLabel}</p>
          <p><strong>Sous-total HT :</strong> ${Number(order.subtotal_ht).toFixed(2)} &euro;</p>
          <p><strong>TVA :</strong> ${Number(order.tva_amount).toFixed(2)} &euro;</p>
          <p><strong>Total TTC :</strong> ${Number(order.total_ttc).toFixed(2)} &euro;</p>
          ${order.notes ? `<p><strong>Notes :</strong> ${escapeHtml(order.notes)}</p>` : ""}
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr style="background:#f3f4f6;">
              <th style="padding:8px;text-align:left;">Fichier</th>
              <th style="padding:8px;text-align:left;">Format</th>
              <th style="padding:8px;text-align:center;">Qté</th>
            </tr>
            ${itemsHtml}
          </table>
        </div>
      </body>
    </html>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
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

  const resendData = await resendResponse.json();
  if (!resendResponse.ok) {
    console.error("Resend error:", resendData);
    throw new Error(resendData.message || "Failed to send email");
  }

  return { success: true, messageId: resendData.id };
}));
