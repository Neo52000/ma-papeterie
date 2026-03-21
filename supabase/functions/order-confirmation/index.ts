import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface OrderConfirmationRequest {
  order_id: string;
  order_number: string;
  customer_email: string;
  customer_name?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total_amount: number;
  shipping_cost: number;
  shipping_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

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
  name: "order-confirmation",
  auth: "auth",
  rateLimit: { prefix: "order-confirm", max: 5, windowMs: 60_000 },
}, async ({ body, corsHeaders }) => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured - order confirmation emails disabled");
    return {
      success: false,
      message: "Email notifications not configured"
    };
  }

  const {
    order_id,
    order_number,
    customer_email,
    customer_name,
    items,
    total_amount,
    shipping_cost,
    shipping_address,
  } = body as OrderConfirmationRequest;

  if (!order_number || !customer_email || !items || items.length === 0) {
    return jsonResponse({ error: "Missing required fields" }, 400, corsHeaders);
  }

  const baseUrl = Deno.env.get("SITE_URL") || "https://ma-papeterie.fr";
  const safeOrderNumber = escapeHtml(order_number);
  const safeCustomerName = customer_name ? escapeHtml(customer_name) : '';
  const safeBaseUrl = escapeHtml(baseUrl);

  const subject = `✅ Confirmation de commande ${safeOrderNumber}`;

  // Build items table rows
  const itemsHtml = items.map(item => {
    const safeName = escapeHtml(item.name);
    const subtotal = (item.quantity * item.price).toFixed(2);
    return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${safeName}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; text-align: right;">${item.price.toFixed(2)} &euro;</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; text-align: right;">${subtotal} &euro;</td>
      </tr>
    `;
  }).join('');

  const shippingLabel = shipping_cost === 0 ? 'Gratuite' : `${shipping_cost.toFixed(2)} &euro;`;

  const safeStreet = shipping_address?.street ? escapeHtml(shipping_address.street) : '';
  const safeCity = shipping_address?.city ? escapeHtml(shipping_address.city) : '';
  const safePostalCode = shipping_address?.postal_code ? escapeHtml(shipping_address.postal_code) : '';
  const safeCountry = shipping_address?.country ? escapeHtml(shipping_address.country) : '';

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
                    <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px;">Merci pour votre commande !</h2>
                    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
                      ${safeCustomerName ? `Bonjour ${safeCustomerName},<br><br>` : ''}Votre commande <strong>${safeOrderNumber}</strong> a bien &eacute;t&eacute; enregistr&eacute;e.
                    </p>

                    <!-- Items table -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                      <tr style="background: #f3f4f6;">
                        <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Produit</th>
                        <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 600;">Qt&eacute;</th>
                        <th style="padding: 12px 16px; text-align: right; font-size: 13px; color: #6b7280; font-weight: 600;">Prix</th>
                        <th style="padding: 12px 16px; text-align: right; font-size: 13px; color: #6b7280; font-weight: 600;">Sous-total</th>
                      </tr>
                      ${itemsHtml}
                      <!-- Separator -->
                      <tr>
                        <td colspan="4" style="padding: 0; height: 2px; background: #e5e7eb;"></td>
                      </tr>
                      <!-- Shipping -->
                      <tr>
                        <td colspan="3" style="padding: 12px 16px; text-align: right; font-size: 14px; color: #6b7280;">Livraison</td>
                        <td style="padding: 12px 16px; text-align: right; font-size: 14px; color: #1f2937;">${shippingLabel}</td>
                      </tr>
                      <!-- Total -->
                      <tr style="background: #f3f4f6;">
                        <td colspan="3" style="padding: 14px 16px; text-align: right; font-size: 16px; color: #1f2937; font-weight: bold;">Total TTC</td>
                        <td style="padding: 14px 16px; text-align: right; font-size: 16px; color: #1e40af; font-weight: bold;">${total_amount.toFixed(2)} &euro;</td>
                      </tr>
                    </table>

                    <!-- Shipping address -->
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">Adresse de livraison</h3>
                      <p style="margin: 0; font-size: 14px; color: #1f2937; line-height: 1.6;">
                        ${safeStreet}<br>
                        ${safePostalCode} ${safeCity}<br>
                        ${safeCountry}
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin-top: 32px;">
                      <a href="${safeBaseUrl}/mon-compte?tab=orders" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
                        Suivre ma commande
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

  console.log("Order confirmation email sent successfully:", resendData);

  return { success: true, messageId: resendData.id };
}));
