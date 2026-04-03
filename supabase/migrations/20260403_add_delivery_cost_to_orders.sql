-- Add missing columns to orders table required by checkout flow
-- Fixes: "Impossible de valider la commande" error caused by inserting
-- into non-existent columns (payment_status, payment_method, stripe_*, delivery_cost)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS delivery_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_method_name text;
