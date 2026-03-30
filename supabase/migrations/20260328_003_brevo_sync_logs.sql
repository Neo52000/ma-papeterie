-- Brevo CRM sync logs
-- Tracks contact syncs and transactional emails sent via Brevo API v3

CREATE TABLE IF NOT EXISTS public.brevo_sync_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT NOT NULL CHECK (event_type IN ('contact_sync', 'transactional_email', 'manual_resync')),
  customer_email TEXT NOT NULL,
  order_id       UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'skipped')),
  brevo_response JSONB,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS : admin read-only
ALTER TABLE public.brevo_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_brevo_logs"
  ON public.brevo_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Indexes for dashboard queries
CREATE INDEX idx_brevo_logs_status ON public.brevo_sync_logs (status, created_at DESC);
CREATE INDEX idx_brevo_logs_email  ON public.brevo_sync_logs (customer_email);
