-- Table pour historique et comparaison des prix concurrents
CREATE TABLE IF NOT EXISTS public.competitor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_price NUMERIC NOT NULL,
  competitor_url TEXT,
  price_difference NUMERIC,
  price_difference_percent NUMERIC,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  product_ean TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_competitor_prices_product_id ON public.competitor_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_scraped_at ON public.competitor_prices(scraped_at DESC);

-- RLS policies
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les prix concurrents sont visibles par tous"
ON public.competitor_prices FOR SELECT
USING (true);

CREATE POLICY "Les admins peuvent gérer les prix concurrents"
ON public.competitor_prices FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));