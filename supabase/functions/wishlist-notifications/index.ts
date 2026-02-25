import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

interface WishlistNotificationRequest {
  userId: string;
  email: string;
  products: Array<{
    id: string;
    title: string;
    handle: string;
    imageUrl?: string;
    currentPrice: string;
    oldPrice?: string;
    notificationType: "sale" | "back_in_stock";
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured - notifications disabled");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Email notifications not configured" 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { userId, email, products }: WishlistNotificationRequest = await req.json();

    if (!email || !products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const saleProducts = products.filter(p => p.notificationType === "sale");
    const backInStockProducts = products.filter(p => p.notificationType === "back_in_stock");

    let subject = "";
    if (saleProducts.length > 0 && backInStockProducts.length > 0) {
      subject = "🎉 Bonnes nouvelles pour vos favoris !";
    } else if (saleProducts.length > 0) {
      subject = "🏷️ Vos favoris sont en promotion !";
    } else {
      subject = "✨ Vos favoris sont de retour en stock !";
    }

    const baseUrl = Deno.env.get("SITE_URL") || "https://ma-papeterie.lovable.app";

    const productHtml = products.map(product => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="80" style="vertical-align: top;">
                ${product.imageUrl 
                  ? `<img src="${product.imageUrl}" alt="${product.title}" width="80" height="80" style="border-radius: 8px; object-fit: cover;" />`
                  : `<div style="width: 80px; height: 80px; background: #f3f4f6; border-radius: 8px;"></div>`
                }
              </td>
              <td style="padding-left: 16px; vertical-align: top;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1f2937;">${product.title}</h3>
                ${product.notificationType === "sale" && product.oldPrice
                  ? `<p style="margin: 0; font-size: 14px;">
                      <span style="text-decoration: line-through; color: #9ca3af;">${product.oldPrice}</span>
                      <span style="color: #059669; font-weight: bold; margin-left: 8px;">${product.currentPrice}</span>
                      <span style="background: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-left: 8px;">PROMO</span>
                    </p>`
                  : `<p style="margin: 0; font-size: 14px; color: #1f2937; font-weight: bold;">${product.currentPrice}</p>`
                }
                ${product.notificationType === "back_in_stock"
                  ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #059669;">✓ De nouveau disponible</p>`
                  : ''
                }
                <a href="${baseUrl}/product/${product.handle}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
                  Voir le produit
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

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
                      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px;">${subject}</h2>
                      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">
                        ${saleProducts.length > 0 && backInStockProducts.length > 0
                          ? `${saleProducts.length} produit(s) en promotion et ${backInStockProducts.length} produit(s) de retour en stock !`
                          : saleProducts.length > 0
                            ? `${saleProducts.length} de vos produits favoris ${saleProducts.length > 1 ? 'sont' : 'est'} en promotion !`
                            : `${backInStockProducts.length} de vos produits favoris ${backInStockProducts.length > 1 ? 'sont de nouveau disponibles' : 'est de nouveau disponible'} !`
                        }
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        ${productHtml}
                      </table>
                      
                      <div style="text-align: center; margin-top: 32px;">
                        <a href="${baseUrl}/mes-favoris" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
                          Voir tous mes favoris
                        </a>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                        Vous recevez cet email car vous avez activé les notifications pour vos favoris.
                      </p>
                      <a href="${baseUrl}/mes-favoris" style="color: #1e40af; font-size: 12px;">Gérer mes notifications</a>
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
        to: [email],
        subject: subject,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      throw new Error(resendData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in wishlist-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
