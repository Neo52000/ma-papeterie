-- ============================================================================
-- Stamp Designs: persists customer stamp design configurations
-- ============================================================================

CREATE TABLE public.stamp_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stamp_model_id UUID NOT NULL REFERENCES public.stamp_models(id) ON DELETE CASCADE,
  design_data JSONB NOT NULL,
  -- design_data schema:
  -- {
  --   lines: [{ id, text, fontFamily, fontSize, bold, italic, alignment }],
  --   logo: { storageKey, x, y, width, height } | null,
  --   shapes: [{ id, type, x, y, width, height, rotation }],
  --   cliparts: [{ id, name, x, y, width, height }],
  --   inkColor: string,
  --   caseColor: string,
  -- }
  preview_image_url TEXT,
  logo_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_cart', 'ordered', 'produced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stamp_designs_user ON public.stamp_designs(user_id);
CREATE INDEX idx_stamp_designs_status ON public.stamp_designs(status);

ALTER TABLE public.stamp_designs ENABLE ROW LEVEL SECURITY;

-- Users can manage their own designs
CREATE POLICY "stamp_designs_own_select" ON public.stamp_designs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "stamp_designs_own_insert" ON public.stamp_designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stamp_designs_own_update" ON public.stamp_designs
  FOR UPDATE USING (auth.uid() = user_id);

-- Anonymous users can create designs (will have null user_id)
CREATE POLICY "stamp_designs_anon_insert" ON public.stamp_designs
  FOR INSERT WITH CHECK (user_id IS NULL);

CREATE POLICY "stamp_designs_anon_select" ON public.stamp_designs
  FOR SELECT USING (user_id IS NULL AND created_at > now() - INTERVAL '24 hours');

-- Admin can read all
CREATE POLICY "stamp_designs_admin_all" ON public.stamp_designs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
