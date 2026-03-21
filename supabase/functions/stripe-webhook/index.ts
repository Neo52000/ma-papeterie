import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createHandler, jsonResponse } from "../_shared/handler.ts";

/**
 * Stripe Webhook handler.
 * Listens for checkout.session.completed, payment_intent and charge events.
 * No JWT required — uses Stripe signature verification instead.
 */

Deno.serve(createHandler({
  name: "stripe-webhook",
  auth: "none",
  rawBody: true,
  rateLimit: { prefix: "stripe-webhook", max: 100, windowMs: 60_000 },
}, async ({ req, corsHeaders }) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    console.error("Stripe keys not configured");
    return jsonResponse({ error: "Server misconfigured" }, 500, corsHeaders);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing signature" }, 400, corsHeaders);
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return jsonResponse({ error: `Webhook Error: ${message}` }, 400, corsHeaders);
  }

  // Idempotence : skip already-processed events
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
    return { received: true, status: "already_processed" };
  }

  // Record the event
  await supabaseAdmin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as Record<string, unknown>,
  });

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      const serviceOrderId = session.metadata?.service_order_id;

      // Service order (reprographie / photo)
      if (serviceOrderId) {
        const { error } = await supabaseAdmin
          .from("service_orders")
          .update({
            payment_status: "paid",
            status: "confirmed",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", serviceOrderId);

        if (error) {
          console.error("Failed to update service order:", error);
          return jsonResponse({ error: "DB error" }, 500, corsHeaders);
        }

        // Fire admin notification for service order
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        fetch(`${supabaseUrl}/functions/v1/service-order-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ service_order_id: serviceOrderId }),
        }).catch(console.error);

        console.log(`Service order ${serviceOrderId} paid via Stripe session ${session.id}`);
        break;
      }

      // Product order
      if (!orderId) {
        console.error("No order_id in session metadata");
        break;
      }

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
        return jsonResponse({ error: "DB error" }, 500, corsHeaders);
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
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            order_id: order.id,
            order_number: order.order_number,
            customer_email: order.customer_email,
            items:
              order.order_items?.map(
                (i: { product_name: string; quantity: number; product_price: number }) => ({
                  name: i.product_name,
                  quantity: i.quantity,
                  price: i.product_price,
                }),
              ) ?? [],
            total_amount: order.total_amount,
            shipping_cost: order.total_amount >= 49 ? 0 : 4.9,
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

  return { received: true };
}));
