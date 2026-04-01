-- Table de session pour stocker les résultats OCR et le tracking analytique
CREATE TABLE IF NOT EXISTS public.school_list_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.school_list_uploads(id) ON DELETE SET NULL,
  filename TEXT,
  mime_type TEXT,
  classe TEXT,
  ecole TEXT,
  ocr_text TEXT,
  parsed_items JSONB,
  match_results JSONB,
  stats JSONB,
  cart_added_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT FALSE
);

-- Index pour analytics
CREATE INDEX idx_school_list_sessions_created ON public.school_list_sessions(created_at DESC);
CREATE INDEX idx_school_list_sessions_user ON public.school_list_sessions(user_id);
CREATE INDEX idx_school_list_sessions_classe ON public.school_list_sessions(classe) WHERE classe IS NOT NULL;

-- RLS
ALTER TABLE public.school_list_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_sessions" ON public.school_list_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_sessions" ON public.school_list_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_sessions" ON public.school_list_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Vue admin pour suivi des conversions
CREATE OR REPLACE VIEW public.school_list_stats AS
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(*) AS sessions,
  COUNT(*) FILTER (WHERE converted = true) AS converted,
  AVG((stats->>'matched')::int) AS avg_matched,
  AVG((stats->>'total_items')::int) AS avg_total,
  ROUND(
    AVG((stats->>'matched')::float / NULLIF((stats->>'total_items')::float, 0) * 100),
    1
  ) AS avg_match_rate_pct
FROM public.school_list_sessions
GROUP BY 1
ORDER BY 1 DESC;

-- Index full-text sur products pour la recherche de correspondances
CREATE INDEX IF NOT EXISTS idx_products_fulltext
ON public.products USING GIN (to_tsvector('french', name || ' ' || COALESCE(description, '')));

-- Fonction RPC pour la recherche full-text depuis l'Edge Function
CREATE OR REPLACE FUNCTION public.search_school_list_products(
  search_query TEXT,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price_ht NUMERIC,
  price_ttc NUMERIC,
  image_url TEXT,
  stock_quantity INT,
  slug TEXT,
  brand TEXT,
  eco BOOLEAN,
  rank REAL
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id, p.name, p.description, p.price_ht, p.price_ttc,
    p.image_url, p.stock_quantity, p.slug, p.brand, p.eco,
    ts_rank(
      to_tsvector('french', p.name || ' ' || COALESCE(p.description, '')),
      plainto_tsquery('french', search_query)
    ) AS rank
  FROM products p
  WHERE
    to_tsvector('french', p.name || ' ' || COALESCE(p.description, ''))
    @@ plainto_tsquery('french', search_query)
    AND p.is_active = true
    AND p.stock_quantity > 0
  ORDER BY rank DESC
  LIMIT max_results;
$$;
