
-- Corriger les RLS policies trop permissives sur les tables d'historique
-- Les edge functions utilisent service_role_key qui bypass RLS, donc ces policies
-- ne s'appliquent qu'aux requêtes anon/authenticated

DROP POLICY IF EXISTS "product_price_history_insert" ON public.product_price_history;
DROP POLICY IF EXISTS "product_lifecycle_logs_insert" ON public.product_lifecycle_logs;

-- Remplacer par des policies qui n'autorisent l'insert que pour les admins
-- (les edge functions avec service_role_key bypass RLS de toute façon)
CREATE POLICY "product_price_history_insert_admins" ON public.product_price_history
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "product_lifecycle_logs_insert_admins" ON public.product_lifecycle_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Agent_logs et data_retention_logs ont des policies WITH CHECK (true) existantes — celles-là sont intentionnelles
-- (les edge functions ont besoin d'insérer des logs sans être authentifiées)
-- On ne les touche pas.
