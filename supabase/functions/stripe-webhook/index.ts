import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

/**
 * Stripe Webhook handler.
 * Listens for checkout.session.completed and payment_intent events.
 * No JWT required — uses Stripe signature verification instead.
 */

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    console.error("Stripe keys not configured");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (!orderId) {
        console.error("No order_id in session metadata");
        break;
      }

      // Update order payment status
      const { error } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", orderId);

      if (error) {
        console.error("Failed to update order:", error);
        return new Response("DB error", { status: 500 });
      }

      // Decrement stock
      const { data: orderItems } = await supabaseAdmin
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (orderItems) {
        for (const item of orderItems) {
          await supabaseAdmin.rpc("decrement_stock", {
            product_id: item.product_id,
            quantity: item.quantity,
          });
        }
      }

      // Fire order confirmation email
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();

      if (order) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        fetch(`${supabaseUrl}/functions/v1/order-confirmation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            order_id: order.id,
            order_number: order.order_number,
            customer_email: order.customer_email,
            items: order.order_items?.map((i: { product_name: string; quantity: number; product_price: number }) => ({
              name: i.product_name,
              quantity: i.quantity,
              price: i.product_price,
            })) ?? [],
            total_amount: order.total_amount,
            shipping_cost: order.total_amount >= 49 ? 0 : 4.90,
            shipping_address: order.shipping_address,
          }),
        }).catch(console.error);
      }

      console.log(`Order ${orderId} paid via Stripe session ${session.id}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;

      // Find order by payment intent
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", intent.id)
        .limit(1);

      if (orders && orders.length > 0) {
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", orders[0].id);
      }

      console.log(`Payment failed for intent ${intent.id}`);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent = charge.payment_intent as string;

      if (paymentIntent) {
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntent)
          .limit(1);

        if (orders && orders.length > 0) {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "refunded", status: "cancelled" })
            .eq("id", orders[0].id);
        }
      }

      console.log(`Refund processed for charge ${charge.id}`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

serve(handler);
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limit.ts";

/**
 * Stripe Webhook handler.
 * Listens for checkout.session.completed, payment_intent and charge events.
 * No JWT required — uses Stripe signature verification instead.
 * Includes: CORS, rate limiting, idempotence via stripe_events table.
 */

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  // Rate limit (webhooks Stripe peuvent être fréquents)
  const rlKey = getRateLimitKey(req, "stripe-webhook");
  if (!(await checkRateLimit(rlKey, 100, 60_000))) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      console.error("Stripe keys not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      console.error("Webhook signature verification failed:", message);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Idempotence : skip already-processed events ───────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: existing } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ received: true, status: "already_processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Record the event
    await supabaseAdmin.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object as Record<string, unknown>,
    });

    // ── Handle events ─────────────────────────────────────────────────────
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (!orderId) {
          console.error("No order_id in session metadata");
          break;
        }

        // Update order payment status
        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            status: "confirmed",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", orderId);

        if (error) {
          console.error("Failed to update order:", error);
          return new Response(
            JSON.stringify({ error: "DB error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Decrement stock
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", orderId);

        if (orderItems) {
          for (const item of orderItems) {
            await supabaseAdmin.rpc("decrement_stock", {
              product_id: item.product_id,
              quantity: item.quantity,
            });
          }
        }

        // Fire order confirmation email
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", orderId)
          .single();

        if (order) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

          fetch(`${supabaseUrl}/functions/v1/order-confirmation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              order_id: order.id,
              order_number: order.order_number,
              customer_email: order.customer_email,
              items: order.order_items?.map((i: { product_name: string; quantity: number; product_price: number }) => ({
                name: i.product_name,
                quantity: i.quantity,
                price: i.product_price,
              })) ?? [],
              total_amount: order.total_amount,
              shipping_cost: order.total_amount >= 49 ? 0 : 4.90,
              shipping_address: order.shipping_address,
            }),
          }).catch(console.error);
        }

        console.log(`Order ${orderId} paid via Stripe session ${session.id}`);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;

        // Find order by payment intent
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("stripe_payment_intent_id", intent.id)
          .limit(1);

        if (orders && orders.length > 0) {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("id", orders[0].id);
        }

        console.log(`Payment failed for intent ${intent.id}`);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent = charge.payment_intent as string;

        if (paymentIntent) {
          const { data: orders } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntent)
            .limit(1);

          if (orders && orders.length > 0) {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "refunded", status: "cancelled" })
              .eq("id", orders[0].id);
          }
        }

        console.log(`Refund processed for charge ${charge.id}`);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        console.log(`Subscription event: ${event.type}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
