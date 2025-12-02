-- Create pricing alerts table
CREATE TABLE IF NOT EXISTS public.pricing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('competitor_lower_price', 'pricing_opportunity', 'margin_below_threshold', 'price_change_recommended')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  competitor_name TEXT,
  our_price DECIMAL(10,2),
  competitor_price DECIMAL(10,2),
  price_difference DECIMAL(10,2),
  price_difference_percent DECIMAL(5,2),
  suggested_action TEXT,
  details JSONB,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pricing_alerts_product_id ON public.pricing_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_pricing_alerts_alert_type ON public.pricing_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_pricing_alerts_severity ON public.pricing_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_pricing_alerts_is_resolved ON public.pricing_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_pricing_alerts_created_at ON public.pricing_alerts(created_at DESC);

-- Add RLS policies
ALTER TABLE public.pricing_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view alerts
CREATE POLICY "Admins can view all pricing alerts"
  ON public.pricing_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can insert alerts
CREATE POLICY "Admins can create pricing alerts"
  ON public.pricing_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins can update alerts
CREATE POLICY "Admins can update pricing alerts"
  ON public.pricing_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_pricing_alerts_updated_at
  BEFORE UPDATE ON public.pricing_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();