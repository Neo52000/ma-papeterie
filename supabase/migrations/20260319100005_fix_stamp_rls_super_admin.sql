-- Fix: allow super_admin role to manage stamp_models and stamp_designs
-- Previously only 'admin' was allowed, but the user account has 'super_admin' role

DROP POLICY IF EXISTS "stamp_models_admin_all" ON public.stamp_models;
CREATE POLICY "stamp_models_admin_all" ON public.stamp_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "stamp_designs_admin_all" ON public.stamp_designs;
CREATE POLICY "stamp_designs_admin_all" ON public.stamp_designs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );
