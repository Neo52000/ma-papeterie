-- ─────────────────────────────────────────────────────────────────────────────
-- Recommandations intelligentes v1 : compatibilité + tracking + seed
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Matrice de compatibilité (ex: imprimante ↔ cartouche) ─────────────────
CREATE TABLE IF NOT EXISTS public.compatibility_matrix (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  compatible_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  compatibility_note   TEXT,        -- "Cartouche compatible avec cette imprimante"
  is_bidirectional     BOOLEAN NOT NULL DEFAULT true,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, compatible_product_id)
);

CREATE INDEX IF NOT EXISTS idx_compat_product ON public.compatibility_matrix(product_id);
CREATE INDEX IF NOT EXISTS idx_compat_compatible ON public.compatibility_matrix(compatible_product_id);

-- ── 2. Log des événements de recommandation (shown/clicked/added) ─────────────
CREATE TABLE IF NOT EXISTS public.recommendation_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        TEXT,              -- identifiant de session navigateur
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_product_id TEXT,              -- produit à l'origine de la reco (UUID as text)
  product_id        TEXT NOT NULL,     -- produit recommandé (UUID as text)
  relation_type     TEXT,              -- complement/compatibility/alternative_durable/substitution
  event_type        TEXT NOT NULL
                      CHECK (event_type IN ('shown','clicked','added_to_cart')),
  placement         TEXT               -- 'product_page' | 'cart'
                      CHECK (placement IN ('product_page','cart')),
  position          SMALLINT,          -- position dans le widget (0-indexed)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reco_logs_type        ON public.recommendation_logs(relation_type);
CREATE INDEX IF NOT EXISTS idx_reco_logs_event       ON public.recommendation_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_reco_logs_product     ON public.recommendation_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_reco_logs_created_at  ON public.recommendation_logs(created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.compatibility_matrix  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs   ENABLE ROW LEVEL SECURITY;

-- Compatibilité : lecture publique, écriture admin
CREATE POLICY "compat_public_read" ON public.compatibility_matrix
  FOR SELECT USING (true);

CREATE POLICY "compat_admin_write" ON public.compatibility_matrix
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- Logs : INSERT public (tracking client), SELECT admin seulement
CREATE POLICY "reco_logs_public_insert" ON public.recommendation_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "reco_logs_admin_read" ON public.recommendation_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- ── 3. Seed product_relations ─────────────────────────────────────────────────
-- Crée des relations d'exemple entre les premiers produits actifs
-- (compléments en anneau + alternatives durables si produits eco existent)
DO $$
DECLARE
  all_ids  UUID[];
  eco_ids  UUID[];
  non_ids  UUID[];
  n        INT;
  i        INT;
BEGIN
  -- Récupérer les 20 premiers produits actifs
  SELECT ARRAY_AGG(id ORDER BY created_at)
  INTO all_ids
  FROM public.products
  WHERE is_active = true
  LIMIT 20;

  n := COALESCE(ARRAY_LENGTH(all_ids, 1), 0);
  IF n < 2 THEN RETURN; END IF;

  -- Compléments : anneau (chaque produit → le suivant)
  FOR i IN 1..n LOOP
    INSERT INTO public.product_relations (product_id, related_product_id, relation_type)
    VALUES (
      all_ids[i]::text,
      all_ids[(i % n) + 1]::text,
      'complement'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Alternatives durables : produits eco → produits non-eco de même catégorie
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO eco_ids
  FROM public.products WHERE is_active = true AND eco = true LIMIT 8;

  SELECT ARRAY_AGG(id ORDER BY created_at) INTO non_ids
  FROM public.products WHERE is_active = true AND (eco = false OR eco IS NULL) LIMIT 8;

  IF eco_ids IS NOT NULL AND non_ids IS NOT NULL THEN
    FOR i IN 1..LEAST(ARRAY_LENGTH(non_ids,1), ARRAY_LENGTH(eco_ids,1)) LOOP
      INSERT INTO public.product_relations (product_id, related_product_id, relation_type)
      VALUES (non_ids[i]::text, eco_ids[i]::text, 'alternative_durable')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
