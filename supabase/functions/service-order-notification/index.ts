import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);
  const headers = { "Content-Type": "application/json", ...corsHeaders };

  try {
    const { service_order_id } = await req.json();

    if (!service_order_id) {
      return new Response(
        JSON.stringify({ error: "service_order_id required" }),
        { status: 400, headers },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch order details
    const { data: order, error } = await supabaseAdmin
      .from("service_orders")
      .select("*, service_order_items(*)")
      .eq("id", service_order_id)
      .single();

    if (error || !order) {
      console.error("Order not found:", error);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers },
      );
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
      return new Response(JSON.stringify({ sent: false, reason: "no_api_key" }), { status: 200, headers });
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
        "Authorization": `Bearer ${resendKey}`,
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

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers },
    );
  } catch (error) {
    console.error("service-order-notification error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers },
    );
  }
});
