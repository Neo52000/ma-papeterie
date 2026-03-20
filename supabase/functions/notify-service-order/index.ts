import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAdminOrSecret, isAuthError } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const handler = async (req: Request): Promise<Response> => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);
  const headers = { "Content-Type": "application/json", ...corsHeaders };

  const rlKey = getRateLimitKey(req, "notify-service");
  if (!(await checkRateLimit(rlKey, 10, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    // Only admin or cron secret can call this directly
    const authCheck = await requireAdminOrSecret(req, corsHeaders);
    if (authCheck) return authCheck;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Email not configured" }),
        { status: 200, headers },
      );
    }

    const { service_order_id } = await req.json();
    if (!service_order_id) {
      return new Response(
        JSON.stringify({ error: "service_order_id requis" }),
        { status: 400, headers },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: order, error } = await supabaseAdmin
      .from("service_orders")
      .select("*")
      .eq("id", service_order_id)
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({ error: "Commande introuvable" }),
        { status: 404, headers },
      );
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

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers },
    );
  } catch (error: any) {
    console.error("notify-service-order error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'envoi de la notification" }),
      { status: 500, headers },
    );
  }
};

serve(handler);
