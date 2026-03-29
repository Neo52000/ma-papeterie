-- Migration : kpi_snapshots
-- Snapshot hebdomadaire des KPIs clés, alimenté manuellement ou via pg_cron

CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,  -- lundi de la semaine mesurée

  -- Acquisition
  sessions INTEGER DEFAULT 0,
  organic_sessions INTEGER DEFAULT 0,

  -- Conversion
  orders INTEGER DEFAULT 0,
  revenue_ttc NUMERIC(10,2) DEFAULT 0,
  aov NUMERIC(10,2) DEFAULT 0,              -- Average Order Value
  conversion_rate NUMERIC(5,4) DEFAULT 0,   -- ex: 0.0215 = 2.15%
  cart_abandonment_rate NUMERIC(5,4) DEFAULT 0,

  -- Liste scolaire (feature propriétaire)
  school_list_uploads INTEGER DEFAULT 0,
  school_list_conversion_rate NUMERIC(5,4) DEFAULT 0,

  -- Rétention
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,

  -- Technique
  shopify_sync_errors INTEGER DEFAULT 0,

  -- Économique
  avg_margin_rate NUMERIC(5,4) DEFAULT 0,   -- ex: 0.32 = 32%

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only" ON public.kpi_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index
CREATE INDEX idx_kpi_snapshots_week ON public.kpi_snapshots(week_start DESC);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_kpi_snapshots
  BEFORE UPDATE ON public.kpi_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Données de seed réalistes pour les 12 dernières semaines (pour le dev/preview)
INSERT INTO public.kpi_snapshots (week_start, sessions, organic_sessions, orders, revenue_ttc, aov, conversion_rate, cart_abandonment_rate, school_list_uploads, school_list_conversion_rate, new_customers, returning_customers, shopify_sync_errors, avg_margin_rate)
VALUES
  (CURRENT_DATE - INTERVAL '77 days', 820, 610, 18, 2340.00, 130.00, 0.0220, 0.72, 4, 0.50, 14, 4, 0, 0.31),
  (CURRENT_DATE - INTERVAL '70 days', 890, 670, 21, 2730.00, 130.00, 0.0236, 0.71, 5, 0.60, 16, 5, 1, 0.32),
  (CURRENT_DATE - INTERVAL '63 days', 950, 720, 23, 3010.00, 131.00, 0.0242, 0.70, 6, 0.67, 17, 6, 0, 0.32),
  (CURRENT_DATE - INTERVAL '56 days', 1020, 780, 25, 3250.00, 130.00, 0.0245, 0.69, 7, 0.71, 18, 7, 0, 0.33),
  (CURRENT_DATE - INTERVAL '49 days', 1100, 840, 28, 3640.00, 130.00, 0.0255, 0.68, 8, 0.75, 20, 8, 0, 0.33),
  (CURRENT_DATE - INTERVAL '42 days', 1180, 910, 31, 4030.00, 130.00, 0.0263, 0.67, 9, 0.78, 22, 9, 1, 0.34),
  (CURRENT_DATE - INTERVAL '35 days', 1250, 970, 33, 4290.00, 130.00, 0.0264, 0.67, 10, 0.80, 23, 10, 0, 0.34),
  (CURRENT_DATE - INTERVAL '28 days', 1320, 1030, 36, 4680.00, 130.00, 0.0273, 0.66, 12, 0.83, 25, 11, 0, 0.35),
  (CURRENT_DATE - INTERVAL '21 days', 1390, 1090, 38, 4940.00, 130.00, 0.0273, 0.65, 13, 0.85, 26, 12, 0, 0.35),
  (CURRENT_DATE - INTERVAL '14 days', 1460, 1150, 41, 5330.00, 130.00, 0.0281, 0.64, 14, 0.86, 28, 13, 0, 0.36),
  (CURRENT_DATE - INTERVAL '7 days',  1540, 1210, 44, 5720.00, 130.00, 0.0286, 0.63, 15, 0.87, 30, 14, 0, 0.36),
  (CURRENT_DATE,                       1580, 1250, 46, 5980.00, 130.00, 0.0291, 0.62, 16, 0.88, 31, 15, 0, 0.37)
ON CONFLICT (week_start) DO NOTHING;
