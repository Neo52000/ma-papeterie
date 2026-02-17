
-- Phase 1: Enrichir le schema produits
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sku_interne TEXT,
ADD COLUMN IF NOT EXISTS attributs JSONB NOT NULL DEFAULT '{}';

-- Index unique sur sku_interne
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_interne ON public.products (sku_interne) WHERE sku_interne IS NOT NULL;

-- Index unique sur EAN (pour les non null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_ean_unique ON public.products (ean) WHERE ean IS NOT NULL AND ean != '';

-- Phase 2: Enrichir le schema fournisseurs
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS supplier_type TEXT,
ADD COLUMN IF NOT EXISTS format_source TEXT,
ADD COLUMN IF NOT EXISTS conditions_commerciales JSONB DEFAULT '{}';

-- Phase 3: Table images dediee
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  url_originale TEXT NOT NULL,
  url_optimisee TEXT,
  alt_seo TEXT,
  is_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product images"
ON public.product_images
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Public can view product images"
ON public.product_images
FOR SELECT
USING (true);

CREATE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 4: Table exceptions
CREATE TABLE IF NOT EXISTS public.product_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_product_exceptions_product_id ON public.product_exceptions(product_id);
CREATE INDEX idx_product_exceptions_type ON public.product_exceptions(exception_type);
CREATE INDEX idx_product_exceptions_resolved ON public.product_exceptions(resolved);

ALTER TABLE public.product_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product exceptions"
ON public.product_exceptions
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Phase 4: Vue "vendable"
CREATE OR REPLACE VIEW public.v_products_vendable AS
SELECT p.*,
  CASE
    WHEN p.ean IS NOT NULL AND p.ean != ''
      AND p.price > 0
      AND EXISTS (
        SELECT 1 FROM public.supplier_products sp
        JOIN public.suppliers s ON s.id = sp.supplier_id
        WHERE sp.product_id = p.id AND s.is_active = true
      )
    THEN true
    ELSE false
  END AS is_vendable
FROM public.products p;
