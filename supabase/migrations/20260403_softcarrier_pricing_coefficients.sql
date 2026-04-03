-- ============================================================================
-- Soft Carrier : table de coefficients PA → PV et correction des prix existants
-- ============================================================================

-- 1. Table des coefficients par famille/sous-famille
CREATE TABLE IF NOT EXISTS public.softcarrier_pricing_coefficients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family text NOT NULL,
  subfamily text,
  coefficient numeric NOT NULL DEFAULT 1.619,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS admin-only
ALTER TABLE public.softcarrier_pricing_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage softcarrier coefficients"
  ON public.softcarrier_pricing_coefficients
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Unique constraint on family+subfamily for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_softcarrier_coeff_family_subfamily
  ON public.softcarrier_pricing_coefficients (family, COALESCE(subfamily, ''));

-- Trigger updated_at
CREATE TRIGGER update_softcarrier_coefficients_updated_at
  BEFORE UPDATE ON public.softcarrier_pricing_coefficients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Coefficient global par défaut : 1.619
INSERT INTO public.softcarrier_pricing_coefficients (family, subfamily, coefficient)
VALUES ('*', NULL, 1.619)
ON CONFLICT (family, COALESCE(subfamily, '')) DO NOTHING;

-- ============================================================================
-- 2. Correction des produits existants importés avec le mauvais prix
--    price_ht actuel = prix d'achat → le déplacer vers cost_price
--    puis recalculer price_ht = cost_price * 1.619
-- ============================================================================

UPDATE products
SET
  cost_price = price_ht,
  price_ht = ROUND(price_ht * 1.619, 2),
  price_ttc = ROUND(price_ht * 1.619 * (1 + COALESCE(tva_rate, 20) / 100), 2),
  price = ROUND(price_ht * 1.619 * (1 + COALESCE(tva_rate, 20) / 100), 2),
  margin_percent = ROUND((1 - 1.0 / 1.619) * 100, 2),
  updated_at = now()
WHERE ref_softcarrier IS NOT NULL
  AND (cost_price IS NULL OR cost_price = 0)
  AND price_ht > 0;
