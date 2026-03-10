import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireAuth, isAuthError } from "../_shared/auth.ts";

interface CheckoutItem {
  product_id: string;
  product_name: string;
  product_price: number; // unit price in EUR
  quantity: number;
}

interface CheckoutRequest {
  items: CheckoutItem[];
  customer_email: string;
  customer_phone?: string;
  shipping_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  billing_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);
  const headers = { "Content-Type": "application/json", ...corsHeaders };

  try {
    // Authenticate user
    const authResult = await requireAuth(req, corsHeaders);
    if (isAuthError(authResult)) return authResult.error;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe n'est pas configuré" }),
        { status: 500, headers },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body: CheckoutRequest = await req.json();
    const { items, customer_email, customer_phone, shipping_address, billing_address, notes } = body;

    if (!items || items.length === 0 || !customer_email) {
      return new Response(
        JSON.stringify({ error: "Champs requis manquants" }),
        { status: 400, headers },
      );
    }

    // Validate stock with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    for (const item of items) {
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();

      if (error || !product || product.stock_quantity < item.quantity) {
        return new Response(
          JSON.stringify({ error: `Stock insuffisant pour ${item.product_name}` }),
          { status: 400, headers },
        );
      }
    }

    // Calculate total
    const subtotal = items.reduce((s, i) => s + i.product_price * i.quantity, 0);
    const shippingCost = subtotal >= 49 ? 0 : 4.90;
    const totalAmount = subtotal + shippingCost;

    // Create the order first (status = pending, payment_status = pending)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: authResult.userId,
        order_number: `TEMP-${Date.now()}`,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
        payment_method: "stripe",
        customer_email,
        customer_phone: customer_phone || null,
        shipping_address,
        billing_address,
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      subtotal: item.product_price * item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.product_name,
        },
        unit_amount: Math.round(item.product_price * 100), // Stripe uses cents
      },
      quantity: item.quantity,
    }));

    // Add shipping line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Frais de livraison" },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://ma-papeterie.fr";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email,
      line_items: lineItems,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: authResult.userId,
      },
      success_url: `${siteUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?cancelled=true`,
    });

    // Store Stripe session ID on the order
    await supabaseAdmin
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        sessionUrl: session.url,
        orderNumber: order.order_number,
      }),
      { status: 200, headers },
    );
  } catch (error: unknown) {
    console.error("create-checkout-session error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers },
    );
  }
};

serve(handler);
