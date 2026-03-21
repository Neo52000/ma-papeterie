import { createHandler, jsonResponse } from "../_shared/handler.ts";
import { requireAuth, requireAdminOrSecret, isAuthError } from "../_shared/auth.ts";

interface OrderStatusUpdateRequest {
  order_number: string;
  customer_email: string;
  old_status: string;
  new_status: string;
  tracking_url?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Validate and sanitize a URL for use in HTML attributes */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return escapeHtml(parsed.href);
  } catch {
    return '';
  }
}

Deno.serve(createHandler({
  name: "order-status-update",
  auth: "none",
  rateLimit: { prefix: "order-status", max: 10, windowMs: 60_000 },
}, async ({ body, corsHeaders, req }) => {
  // Accept either authenticated user or admin/service-role (for dashboard calls)
  const authResult = await requireAuth(req, corsHeaders);
  if (isAuthError(authResult)) {
    // If regular auth fails, check for admin or service role key
    const adminError = await requireAdminOrSecret(req, corsHeaders);
    if (adminError) return adminError;
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured - order status emails disabled");
    return {
      success: false,
      message: "Email notifications not configured"
    };
  }

  const {
    order_number,
    customer_email,
    old_status,
    new_status,
    tracking_url,
  } = body as OrderStatusUpdateRequest;

  if (!order_number || !customer_email || !new_status) {
    return jsonResponse({ error: "Missing required fields" }, 400, corsHeaders);
  }

  const baseUrl = Deno.env.get("SITE_URL") || "https://ma-papeterie.fr";
  const safeOrderNumber = escapeHtml(order_number);
  const safeBaseUrl = escapeHtml(baseUrl);

  const oldStatusLabel = STATUS_LABELS[old_status] || escapeHtml(old_status || 'Inconnu');
  const newStatusLabel = STATUS_LABELS[new_status] || escapeHtml(new_status);

  // Status-dependent subject
  let subject: string;
  let statusIcon: string;
  switch (new_status) {
    case 'shipped':
      subject = `📦 Votre commande ${safeOrderNumber} a été expédiée !`;
      statusIcon = '📦';
      break;
    case 'delivered':
      subject = `✅ Votre commande ${safeOrderNumber} a été livrée`;
      statusIcon = '✅';
      break;
    case 'cancelled':
      subject = `❌ Votre commande ${safeOrderNumber} a été annulée`;
      statusIcon = '❌';
      break;
    default:
      subject = `📋 Mise à jour de votre commande ${safeOrderNumber}`;
      statusIcon = '📋';
      break;
  }

  // Tracking button (only for shipped status with valid URL)
  let trackingButtonHtml = '';
  if (new_status === 'shipped' && tracking_url) {
    const safeTrackingUrl = sanitizeUrl(tracking_url);
    if (safeTrackingUrl) {
      trackingButtonHtml = `
        <div style="text-align: center; margin-top: 24px;">
          <a href="${safeTrackingUrl}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
            Suivre mon colis
          </a>
        </div>
      `;
    }
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 24px;">Ma Papeterie</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px;">${statusIcon} Mise &agrave; jour de votre commande</h2>
                    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      Votre commande <strong>${safeOrderNumber}</strong> est pass&eacute;e de <em>${oldStatusLabel}</em> &agrave; <strong>${newStatusLabel}</strong>.
                    </p>

                    <!-- Status badge -->
                    <div style="text-align: center; margin: 24px 0;">
                      <span style="display: inline-block; padding: 8px 20px; background: ${new_status === 'cancelled' ? '#fef2f2' : '#f0fdf4'}; color: ${new_status === 'cancelled' ? '#dc2626' : '#059669'}; border-radius: 20px; font-size: 14px; font-weight: 600;">
                        ${newStatusLabel}
                      </span>
                    </div>

                    ${trackingButtonHtml}

                    <!-- CTA Button -->
                    <div style="text-align: center; margin-top: 24px;">
                      <a href="${safeBaseUrl}/mon-compte?tab=orders" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
                        Voir ma commande
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                      Ma Papeterie &mdash; Votre expert en fournitures
                    </p>
                    <a href="${safeBaseUrl}/cgv" style="color: #1e40af; font-size: 12px;">Conditions g&eacute;n&eacute;rales de vente</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // Send email via Resend
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ma Papeterie <notifications@resend.dev>",
      to: [customer_email],
      subject: subject,
      html: emailHtml,
    }),
  });

  const resendData = await resendResponse.json();

  if (!resendResponse.ok) {
    console.error("Resend API error:", resendData);
    throw new Error(resendData.message || "Failed to send email");
  }

  console.log("Order status update email sent successfully:", resendData);

  return { success: true, messageId: resendData.id };
}));
