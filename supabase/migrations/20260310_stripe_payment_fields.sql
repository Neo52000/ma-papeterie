-- ── P11: Payment integration — Add payment fields to orders ──────────────────
-- Adds Stripe payment tracking columns to the orders table.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id
  ON public.orders (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders (payment_status);
