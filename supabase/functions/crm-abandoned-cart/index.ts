import { createHandler } from "../_shared/handler.ts";

Deno.serve(createHandler({
  name: "crm-abandoned-cart",
  auth: "admin-or-secret",
  rateLimit: { prefix: "crm-cart", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin }) => {
  // Fetch abandoned carts older than 2 hours, not yet emailed, not recovered
  const { data: carts, error: fetchError } = await supabaseAdmin
    .from("abandoned_carts")
    .select("id, session_id, profile_id, email, items, cart_total")
    .eq("recovery_email_sent", false)
    .eq("recovered", false)
    .gt("expires_at", new Date().toISOString())
    .lt("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .limit(50);

  if (fetchError) throw fetchError;
  if (!carts || carts.length === 0) {
    return { success: true, processed: 0, message: "No abandoned carts to process" };
  }

  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const templateId = parseInt(Deno.env.get("BREVO_TEMPLATE_CART_ABANDONED") ?? "0");
  let processed = 0;
  const errors: Array<{ cart_id: string; error: string }> = [];

  for (const cart of carts) {
    try {
      // Resolve customer name from profile if available
      let prenom = "Client";
      if (cart.profile_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", cart.profile_id)
          .single();
        if (profile?.display_name) {
          prenom = profile.display_name.split(" ")[0];
        }
      }

      // Build HTML for cart items
      const items = (cart.items as Array<{
        product_id?: string;
        title?: string;
        qty?: number;
        price_ttc?: number;
        image_url?: string;
      }>) ?? [];

      const cartItemsHtml = items.map((item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">
            ${item.image_url ? `<img src="${item.image_url}" alt="" width="50" height="50" style="border-radius:4px;">` : ""}
          </td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${item.title ?? "Produit"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">x${item.qty ?? 1}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(item.price_ttc ?? 0)}</td>
        </tr>`
      ).join("");

      const cartUrl = `https://ma-papeterie.fr/panier?recover=${cart.id}`;
      const cartTotalFormatted = new Intl.NumberFormat("fr-FR", {
        style: "currency", currency: "EUR",
      }).format(cart.cart_total ?? 0);

      // Send via Brevo API
      if (brevoApiKey && templateId && cart.email) {
        const brevoResp = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId,
            to: [{ email: cart.email, name: prenom }],
            params: {
              PRENOM: prenom,
              CART_ITEMS: `<table style="width:100%;border-collapse:collapse;">${cartItemsHtml}</table>`,
              CART_TOTAL: cartTotalFormatted,
              CART_URL: cartUrl,
            },
            sender: { name: "Ma Papeterie", email: "contact@ma-papeterie.fr" },
            replyTo: { name: "Elie — Ma Papeterie", email: "contact@ma-papeterie.fr" },
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (!brevoResp.ok) {
          const errBody = await brevoResp.text();
          throw new Error(`Brevo API error ${brevoResp.status}: ${errBody}`);
        }
      }

      // Mark cart as emailed
      await supabaseAdmin
        .from("abandoned_carts")
        .update({
          recovery_email_sent: true,
          recovery_email_sent_at: new Date().toISOString(),
        })
        .eq("id", cart.id);

      // Log interaction
      if (cart.profile_id) {
        await supabaseAdmin.from("customer_interactions").insert({
          user_id: cart.profile_id, // will be resolved via profile
          profile_id: cart.profile_id,
          interaction_type: "email_sent",
          channel: "email",
          subject: "Relance panier abandonne",
          description: `Email de relance envoye pour un panier de ${cartTotalFormatted}`,
          metadata: { cart_id: cart.id, cart_total: cart.cart_total },
          created_by: "00000000-0000-0000-0000-000000000000", // system
        });
      }

      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push({ cart_id: cart.id, error: errorMsg });
      console.error(`[crm-abandoned-cart] Error processing cart ${cart.id}:`, errorMsg);
    }
  }

  // Log execution to cron_job_logs
  await supabaseAdmin.from("cron_job_logs").insert({
    function_name: "crm-abandoned-cart",
    status: errors.length === 0 ? "success" : "partial",
    details: JSON.stringify({ processed, errors: errors.length, total: carts.length }),
    executed_at: new Date().toISOString(),
  }).then(() => {/* ignore log errors */}).catch(() => {/* ignore */});

  return { success: true, processed, errors: errors.length, total: carts.length };
}));
