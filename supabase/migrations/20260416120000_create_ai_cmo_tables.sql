-- ============================================================================
-- Migration: Create AI-CMO tables for brand visibility monitoring
-- Date: 2026-04-16
-- Description: 7 tables for the AI-CMO module that monitors brand visibility
--   in conversational AI platforms (ChatGPT, Gemini, etc.).
--   Tables: profiles, competitors, questions, prompt_runs,
--           dashboard_stats, recommendations, llm_costs.
-- ============================================================================

-- ── 1. ai_cmo_profiles (single-row, upsert pattern) ────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cmo_profiles (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  description     text,
  website         text,
  name_aliases    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  llm_understanding text,
  products        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_cmo_profiles IS 'AI-CMO brand identity profile (single row)';

-- ── 2. ai_cmo_competitors ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cmo_competitors (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  website    text,
  weight     smallint    NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
  sort_order smallint    NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_cmo_competitors IS 'AI-CMO tracked competitors';

-- ── 3. ai_cmo_questions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cmo_questions (
  id                       uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt                   text        NOT NULL,
  prompt_type              text        NOT NULL DEFAULT 'product' CHECK (prompt_type IN ('product', 'expertise')),
  target_country           text,
  is_active                boolean     NOT NULL DEFAULT false,
  refresh_interval_seconds integer     NOT NULL DEFAULT 86400,
  last_run_at              timestamptz,
  next_run_at              timestamptz,
  sort_order               smallint    NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_cmo_questions IS 'AI-CMO monitoring prompts sent to LLMs';

-- ── 4. ai_cmo_prompt_runs (read-only, written by external service) ─────────

CREATE TABLE IF NOT EXISTS public.ai_cmo_prompt_runs (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id         uuid        REFERENCES public.ai_cmo_questions(id) ON DELETE SET NULL,
  llm_provider        text        NOT NULL,
  llm_model           text        NOT NULL,
  brand_mentioned     boolean,
  company_domain_rank smallint,
  top_domain          text,
  raw_response        text,
  mentioned_pages     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  run_at              timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_cmo_prompt_runs IS 'AI-CMO LLM execution results (read-only from admin)';

-- ── 5. ai_cmo_dashboard_stats (read-only, single row) ─────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cmo_dashboard_stats (
  id                     uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_visibility_score    real        NOT NULL DEFAULT 0,
  website_citation_share real        NOT NULL DEFAULT 0,
  total_runs             integer     NOT NULL DEFAULT 0,
  share_of_voice         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  computed_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_cmo_dashboard_stats IS 'AI-CMO aggregated KPI dashboard (read-only from admin)';

-- ── 6. ai_cmo_recommendations (read-only) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cmo_recommendations (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_domain  text,
  prompts_to_analyze jsonb       NOT NULL DEFAULT '[]'::jsonb,
  why_competitor     text,
  why_not_user       text,
  what_to_do         text,
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_cmo_recommendations IS 'AI-CMO competitive analysis recommendations (read-only from admin)';

-- ── 7. ai_cmo_llm_costs (read-only) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cmo_llm_costs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  model      text        NOT NULL,
  call_type  text,
  date       date        NOT NULL,
  cost       real        NOT NULL DEFAULT 0,
  call_count integer,
  tokens_in  integer,
  tokens_out integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_cmo_llm_costs IS 'AI-CMO LLM API usage costs tracking (read-only from admin)';

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_ai_cmo_prompt_runs_question  ON public.ai_cmo_prompt_runs (question_id);
CREATE INDEX idx_ai_cmo_prompt_runs_run_at    ON public.ai_cmo_prompt_runs (run_at DESC);
CREATE INDEX idx_ai_cmo_llm_costs_date        ON public.ai_cmo_llm_costs (date DESC);
CREATE INDEX idx_ai_cmo_competitors_sort      ON public.ai_cmo_competitors (sort_order);
CREATE INDEX idx_ai_cmo_questions_sort        ON public.ai_cmo_questions (sort_order);

-- ── RLS Policies ──────────────────────────────────────────────────────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_cmo_profiles',
    'ai_cmo_competitors',
    'ai_cmo_questions',
    'ai_cmo_prompt_runs',
    'ai_cmo_dashboard_stats',
    'ai_cmo_recommendations',
    'ai_cmo_llm_costs'
  ] LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Public read access (for anon key + authenticated)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (true)',
      t || '_select_all', t
    );

    -- Admin-only insert
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.is_admin())',
      t || '_insert_admin', t
    );

    -- Admin-only update
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.is_admin())',
      t || '_update_admin', t
    );

    -- Admin-only delete
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (public.is_admin())',
      t || '_delete_admin', t
    );
  END LOOP;
END $$;

-- ── updated_at triggers (reuse existing set_updated_at function) ──────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_cmo_profiles',
    'ai_cmo_competitors',
    'ai_cmo_questions',
    'ai_cmo_dashboard_stats',
    'ai_cmo_recommendations'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END $$;
