-- ─────────────────────────────────────────────────────────────────────────────
-- Transparence prix : exceptions par produit + coût livraison concurrent
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Coût de livraison configurable par concurrent ─────────────────────────
-- Permet de comparer "prix livré" (prix produit + frais de port)
ALTER TABLE public.competitors
  ADD COLUMN IF NOT EXISTS delivery_cost DECIMAL(6, 2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN public.competitors.delivery_cost IS
  'Frais de livraison standard du concurrent (€) pour comparaison "prix livré"';

-- ── 2. Exceptions de transparence par produit ─────────────────────────────────
-- Un produit dans cette table n'affiche PAS le bloc "Transparence prix"
CREATE TABLE IF NOT EXISTS public.price_exceptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  reason      TEXT,                -- motif optionnel (ex: "tarif négocié", "promotion exclusive")
  disabled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  disabled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_exceptions_product
  ON public.price_exceptions(product_id);

-- ── 3. RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.price_exceptions ENABLE ROW LEVEL SECURITY;

-- Lecture publique : on vérifie côté client si le produit est exclu avant d'afficher le bloc
CREATE POLICY "price_exceptions_public_read" ON public.price_exceptions
  FOR SELECT USING (true);

-- Écriture : admins seulement
CREATE POLICY "price_exceptions_admin_write" ON public.price_exceptions
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
