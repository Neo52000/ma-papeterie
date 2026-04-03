import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createHandler, jsonResponse } from "../_shared/handler.ts";

interface CheckoutItem {
  product_id: string;
  product_name: string;
  product_price: number;
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
  delivery_cost?: number;
  shipping_method_name?: string;
}

Deno.serve(createHandler({
  name: "create-checkout-session",
  auth: "auth",
  rateLimit: { prefix: "checkout", max: 10, windowMs: 60_000 },
}, async ({ supabaseAdmin, body, corsHeaders, userId }) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return jsonResponse({ error: "Stripe n'est pas configuré" }, 500, corsHeaders);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  const { items, customer_email, customer_phone, shipping_address, billing_address, notes, delivery_cost, shipping_method_name } =
    body as CheckoutRequest;

  if (!items || items.length === 0 || !customer_email) {
    return jsonResponse({ error: "Champs requis manquants" }, 400, corsHeaders);
  }

  // Validate stock and fetch verified prices from DB
  const productIds = items.map((i) => i.product_id);
  const { data: dbProducts, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, price_ttc, stock_quantity")
    .in("id", productIds);

  if (productsError || !dbProducts) {
    return jsonResponse({ error: "Erreur lors de la vérification des produits" }, 500, corsHeaders);
  }

  const verifiedProducts = new Map(dbProducts.map((p) => [p.id, p]));

  for (const item of items) {
    const product = verifiedProducts.get(item.product_id);
    if (!product) {
      return jsonResponse({ error: `Produit introuvable : ${item.product_id}` }, 400, corsHeaders);
    }
    if (!product.price_ttc || product.price_ttc <= 0) {
      return jsonResponse({ error: `Prix invalide pour ${product.name}` }, 400, corsHeaders);
    }
    if (product.stock_quantity < item.quantity) {
      return jsonResponse({ error: `Stock insuffisant pour ${product.name}` }, 400, corsHeaders);
    }
  }

  // Calculate total using verified DB prices
  const subtotal = items.reduce((s, i) => {
    const p = verifiedProducts.get(i.product_id)!;
    return s + p.price_ttc * i.quantity;
  }, 0);
  const shippingCost = delivery_cost ?? (subtotal >= 49 ? 0 : 4.9);
  const totalAmount = subtotal + shippingCost;

  // Create the order first (status = pending)
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: userId,
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
      delivery_cost: shippingCost,
      shipping_method_name: shipping_method_name || null,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items using verified DB prices and names
  const orderItems = items.map((item) => {
    const product = verifiedProducts.get(item.product_id)!;
    return {
      order_id: order.id,
      product_id: item.product_id,
      product_name: product.name,
      product_price: product.price_ttc,
      quantity: item.quantity,
      subtotal: product.price_ttc * item.quantity,
    };
  });

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
  if (itemsError) throw itemsError;

  // Build Stripe line items using verified DB prices
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    const product = verifiedProducts.get(item.product_id)!;
    return {
      price_data: {
        currency: "eur",
        product_data: { name: product.name },
        unit_amount: Math.round(product.price_ttc * 100),
      },
      quantity: item.quantity,
    };
  });

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

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email,
    line_items: lineItems,
    metadata: {
      order_id: order.id,
      order_number: order.order_number,
      user_id: userId!,
    },
    success_url: `${siteUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout?cancelled=true`,
  });

  await supabaseAdmin
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  return {
    sessionId: session.id,
    sessionUrl: session.url,
    orderNumber: order.order_number,
  };
}));
