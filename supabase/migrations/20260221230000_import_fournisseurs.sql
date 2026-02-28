-- ─────────────────────────────────────────────────────────────────────────────
-- Import fournisseurs v1 : staging → apply → rollback + templates mapping
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Jobs d'import ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  filename        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'staging'
                    CHECK (status IN ('staging','applying','done','error','rolled_back')),
  total_rows      INTEGER NOT NULL DEFAULT 0,
  ok_rows         INTEGER NOT NULL DEFAULT 0,
  error_rows      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at      TIMESTAMPTZ,
  rolled_back_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_supplier ON public.import_jobs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created  ON public.import_jobs(created_at DESC);

-- ── 2. Lignes staging ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_job_rows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_index       INTEGER NOT NULL,
  raw_data        JSONB NOT NULL DEFAULT '{}',
  mapped_data     JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'staging'
                    CHECK (status IN ('staging','invalid','applied','error','rolled_back')),
  error_messages  TEXT[] NOT NULL DEFAULT '{}',
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_rows_job    ON public.import_job_rows(job_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_status ON public.import_job_rows(job_id, status);

-- ── 3. Templates de mapping par fournisseur ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_mapping_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Template par défaut',
  mapping      JSONB NOT NULL DEFAULT '{}',   -- { internalField: sourceColumn }
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_tpl_supplier ON public.import_mapping_templates(supplier_id);

-- ── 4. Snapshots avant apply (pour rollback) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  snapshot    JSONB NOT NULL,   -- copie complète de la ligne products avant modification
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_snapshots_job ON public.import_snapshots(job_id);

-- ── 5. RLS — accès admin uniquement ─────────────────────────────────────────
ALTER TABLE public.import_jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_job_rows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_snapshots        ENABLE ROW LEVEL SECURITY;

-- import_jobs
CREATE POLICY "import_jobs_admin" ON public.import_jobs
  FOR ALL USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- import_job_rows
CREATE POLICY "import_rows_admin" ON public.import_job_rows
  FOR ALL USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- import_mapping_templates
CREATE POLICY "import_tpl_admin" ON public.import_mapping_templates
  FOR ALL USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- import_snapshots
CREATE POLICY "import_snap_admin" ON public.import_snapshots
  FOR ALL USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );
