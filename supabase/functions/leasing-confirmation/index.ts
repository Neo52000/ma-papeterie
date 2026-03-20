import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

interface LeasingConfirmationRequest {
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  total_amount_ht: number;
  desired_duration: number;
  monthly_estimate_ht: number;
  products: Array<{ product_id: string; name: string; quantity: number; price_ht: number }>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const handler = async (req: Request): Promise<Response> => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  // Aggressive rate limiting — 3 requests per IP per minute
  const rlKey = getRateLimitKey(req, "leasing-confirm");
  if (!(await checkRateLimit(rlKey, 3, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured — leasing emails disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: LeasingConfirmationRequest = await req.json();

    if (!body.email || !body.first_name || !body.company_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const safeName = escapeHtml(`${body.first_name} ${body.last_name}`);
    const safeCompany = escapeHtml(body.company_name);
    const safeEmail = escapeHtml(body.email);
    const monthlyTtc = (body.monthly_estimate_ht * 1.2).toFixed(2);

    // Build products list if any
    const productsHtml = body.products && body.products.length > 0
      ? body.products
          .map(
            (p) =>
              `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(p.name)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center;">${p.quantity}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">${(p.price_ht * p.quantity).toFixed(2)} &euro; HT</td>
              </tr>`
          )
          .join("")
      : "";

    const productsSection = productsHtml
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280;">Produit</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280;">Qté</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280;">Total HT</th>
          </tr>
          ${productsHtml}
        </table>`
      : "";

    // ── Email client ──
    const clientHtml = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:32px;text-align:center;">
                <h1 style="margin:0;color:white;font-size:24px;">Ma Papeterie</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Reine &amp; Fils</p>
              </td></tr>
              <tr><td style="padding:32px;">
                <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Votre demande de devis leasing a bien &eacute;t&eacute; re&ccedil;ue</h2>
                <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
                  Bonjour ${safeName},<br><br>
                  Nous avons bien re&ccedil;u votre demande de leasing mobilier pour <strong>${safeCompany}</strong>.
                  Notre &eacute;quipe vous contacte sous <strong>24h ouvr&eacute;es</strong>.
                </p>

                <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:24px;">
                  <h3 style="margin:0 0 12px;font-size:14px;color:#6b7280;">R&eacute;capitulatif de votre projet</h3>
                  ${productsSection}
                  <p style="margin:4px 0;font-size:14px;color:#1f2937;"><strong>Montant total :</strong> ${body.total_amount_ht.toFixed(2)} &euro; HT</p>
                  <p style="margin:4px 0;font-size:14px;color:#1f2937;"><strong>Dur&eacute;e :</strong> ${body.desired_duration} mois</p>
                  <p style="margin:4px 0;font-size:14px;color:#1e40af;"><strong>Mensualit&eacute; estim&eacute;e :</strong> ~${body.monthly_estimate_ht.toFixed(2)} &euro; HT/mois (${monthlyTtc} &euro; TTC)</p>
                </div>

                <p style="margin:0 0 24px;color:#9ca3af;font-size:11px;font-style:italic;">
                  Simulation indicative non contractuelle. Financement soumis &agrave; acceptation Leasecom.
                </p>

                <div style="text-align:center;margin-top:32px;">
                  <a href="https://ma-papeterie.fr/leasing-mobilier-bureau" style="display:inline-block;padding:12px 24px;background:#1e40af;color:white;text-decoration:none;border-radius:8px;font-weight:500;">
                    En savoir plus sur le leasing
                  </a>
                </div>
              </td></tr>
              <tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Ma Papeterie &mdash; Reine &amp; Fils</p>
                <p style="margin:0;color:#6b7280;font-size:12px;">03 10 96 02 24 &bull; contact@ma-papeterie.fr</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body></html>
    `;

    // ── Email admin ──
    const adminHtml = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px;background:#f9fafb;">
        <h2 style="color:#1f2937;">[LEASING] Nouvelle demande — ${safeCompany} — ${body.total_amount_ht.toFixed(2)}&euro;</h2>
        <table style="border-collapse:collapse;width:100%;max-width:600px;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Contact</td><td style="padding:8px;border:1px solid #e5e7eb;">${safeName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #e5e7eb;">${safeEmail}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Entreprise</td><td style="padding:8px;border:1px solid #e5e7eb;">${safeCompany}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Montant HT</td><td style="padding:8px;border:1px solid #e5e7eb;">${body.total_amount_ht.toFixed(2)} &euro;</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Dur&eacute;e</td><td style="padding:8px;border:1px solid #e5e7eb;">${body.desired_duration} mois</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Mensualit&eacute; HT</td><td style="padding:8px;border:1px solid #e5e7eb;">~${body.monthly_estimate_ht.toFixed(2)} &euro;</td></tr>
        </table>
        ${productsSection}
      </body></html>
    `;

    // Send both emails in parallel
    const [clientRes, adminRes] = await Promise.all([
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Ma Papeterie <notifications@resend.dev>",
          to: [body.email],
          subject: `Votre demande de devis leasing — Ma Papeterie`,
          html: clientHtml,
        }),
      }),
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Ma Papeterie <notifications@resend.dev>",
          to: ["contact@ma-papeterie.fr"],
          subject: `[LEASING] Nouvelle demande — ${body.company_name} — ${body.total_amount_ht.toFixed(2)}€`,
          html: adminHtml,
        }),
      }),
    ]);

    const clientData = await clientRes.json();
    const adminData = await adminRes.json();

    if (!clientRes.ok) {
      console.error("Client email failed:", clientData);
    }
    if (!adminRes.ok) {
      console.error("Admin email failed:", adminData);
    }

    console.log("Leasing confirmation emails sent:", { client: clientData?.id, admin: adminData?.id });

    return new Response(
      JSON.stringify({ success: true, clientMessageId: clientData?.id, adminMessageId: adminData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in leasing-confirmation function:", message);
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'envoi des notifications leasing" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
