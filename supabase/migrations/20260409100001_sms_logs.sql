-- SMS send log (mirrors brevo_sync_logs pattern)

CREATE TABLE public.sms_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone    TEXT NOT NULL,
  user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sms_type           TEXT NOT NULL CHECK (sms_type IN (
    'order_status', 'shipping_alert', 'service_order',
    'wishlist_alert', 'promotional', 'test'
  )),
  message_text       TEXT NOT NULL,
  -- Polymorphic reference IDs
  order_id           UUID,
  service_order_id   UUID,
  campaign_id        UUID,
  -- Gateway response
  gateway_message_id TEXT,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'failed', 'rejected'
  )),
  error_message      TEXT,
  gateway_response   JSONB,
  -- Delivery tracking
  sent_at            TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Admins read all logs
CREATE POLICY "admins_read_sms_logs"
  ON public.sms_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX idx_sms_logs_status ON public.sms_logs(status, created_at DESC);
CREATE INDEX idx_sms_logs_phone  ON public.sms_logs(recipient_phone);
CREATE INDEX idx_sms_logs_user   ON public.sms_logs(user_id);
CREATE INDEX idx_sms_logs_type   ON public.sms_logs(sms_type, created_at DESC);
