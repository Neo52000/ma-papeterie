-- SMS campaigns (admin-triggered bulk sends)

CREATE TABLE public.sms_campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  message_text      TEXT NOT NULL,
  target_segment    TEXT NOT NULL DEFAULT 'all_opted_in'
    CHECK (target_segment IN ('all_opted_in', 'vip', 'regular', 'occasional', 'custom')),
  custom_phone_numbers TEXT[],
  total_recipients  INTEGER NOT NULL DEFAULT 0,
  sent_count        INTEGER NOT NULL DEFAULT 0,
  delivered_count   INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'completed', 'cancelled')),
  scheduled_at      TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_sms_campaigns"
  ON public.sms_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE INDEX idx_sms_campaigns_status ON public.sms_campaigns(status, created_at DESC);
