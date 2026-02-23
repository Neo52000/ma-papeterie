-- ─────────────────────────────────────────────────────────────────────────────
-- Tables du système de scraping réel (scrape-prices edge function)
-- Doit s'exécuter AVANT price_transparency.sql (qui ALTER TABLE competitors)
-- et AVANT insert-competitors.sql (qui INSERT INTO competitors)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Concurrents ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.competitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  base_url      TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  price_selector TEXT,
  rate_limit_ms  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Mapping produit ↔ URL chez le concurrent ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.competitor_product_map (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  competitor_id   UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  product_url     TEXT NOT NULL,
  pack_size       INTEGER NOT NULL DEFAULT 1,
  active          BOOLEAN NOT NULL DEFAULT true,
  last_success_at TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Historique des prix scrapés ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  pack_size     INTEGER NOT NULL DEFAULT 1,
  price         DECIMAL(10, 2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'EUR',
  source_url    TEXT,
  is_suspect    BOOLEAN NOT NULL DEFAULT false,
  scraped_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. Meilleur prix actuel par produit/pack (vue matérialisée en table) ──────
CREATE TABLE IF NOT EXISTS public.price_current (
  product_id         UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  pack_size          INTEGER NOT NULL DEFAULT 1,
  best_price         DECIMAL(10, 2),
  best_competitor_id UUID REFERENCES public.competitors(id) ON DELETE SET NULL,
  sample_count       INTEGER NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, pack_size)
);

-- ── 5. Journal des runs de scraping ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status       TEXT NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running', 'success', 'partial', 'fail')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  offers_saved INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  details      JSONB
);

-- ── Index ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_competitor_product_map_product
  ON public.competitor_product_map(product_id);
CREATE INDEX IF NOT EXISTS idx_competitor_product_map_competitor
  ON public.competitor_product_map(competitor_id);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_product
  ON public.price_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_scraped_at
  ON public.price_snapshots(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_product_pack
  ON public.price_snapshots(product_id, pack_size);

CREATE INDEX IF NOT EXISTS idx_price_current_product
  ON public.price_current(product_id);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_status
  ON public.scrape_runs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_finished_at
  ON public.scrape_runs(finished_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.competitors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_product_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_current          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_runs            ENABLE ROW LEVEL SECURITY;

-- competitors : lecture publique (affichage frontend), écriture admin
CREATE POLICY "competitors_public_read" ON public.competitors
  FOR SELECT USING (true);

CREATE POLICY "competitors_admin_write" ON public.competitors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- competitor_product_map : lecture publique, écriture admin
CREATE POLICY "map_public_read" ON public.competitor_product_map
  FOR SELECT USING (true);

CREATE POLICY "map_admin_write" ON public.competitor_product_map
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- price_snapshots : lecture publique, insertion via service role (edge functions)
CREATE POLICY "snapshots_public_read" ON public.price_snapshots
  FOR SELECT USING (true);

CREATE POLICY "snapshots_service_insert" ON public.price_snapshots
  FOR INSERT WITH CHECK (true);

-- price_current : lecture publique, upsert via service role
CREATE POLICY "price_current_public_read" ON public.price_current
  FOR SELECT USING (true);

CREATE POLICY "price_current_service_all" ON public.price_current
  FOR ALL USING (true) WITH CHECK (true);

-- scrape_runs : admin seulement
CREATE POLICY "scrape_runs_admin_all" ON public.scrape_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
