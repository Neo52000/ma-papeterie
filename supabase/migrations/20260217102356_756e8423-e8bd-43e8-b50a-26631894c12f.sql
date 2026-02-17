
-- ============================================
-- 1. Vue stock virtuel agrégé
-- Agrège le stock depuis toutes les sources avec pondération
-- ============================================
CREATE OR REPLACE VIEW public.v_stock_virtuel AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.ean,
  p.sku_interne,
  -- Stock propre (boutique + entrepôt)
  COALESCE(p.stock_quantity, 0) AS stock_propre,
  -- Stock emplacements détaillés
  COALESCE(loc_boutique.total, 0) AS stock_boutique,
  COALESCE(loc_entrepot.total, 0) AS stock_entrepot,
  COALESCE(loc_fournisseur.total, 0) AS stock_fournisseur,
  -- Stock fournisseurs (depuis supplier_products)
  COALESCE(sp_stock.total, 0) AS stock_fournisseurs_distant,
  -- Stock virtuel = stock propre + stock fournisseur pondéré (50%)
  COALESCE(p.stock_quantity, 0) 
    + COALESCE(loc_boutique.total, 0)
    + COALESCE(loc_entrepot.total, 0)
    + ROUND(COALESCE(sp_stock.total, 0) * 0.5) AS stock_virtuel,
  -- Seuils
  COALESCE(p.min_stock_alert, 10) AS seuil_alerte,
  COALESCE(p.reorder_quantity, 50) AS quantite_reappro,
  -- Statut
  CASE
    WHEN COALESCE(p.stock_quantity, 0) + COALESCE(loc_boutique.total, 0) + COALESCE(loc_entrepot.total, 0) + ROUND(COALESCE(sp_stock.total, 0) * 0.5) <= 0 THEN 'rupture'
    WHEN COALESCE(p.stock_quantity, 0) + COALESCE(loc_boutique.total, 0) + COALESCE(loc_entrepot.total, 0) <= COALESCE(p.min_stock_alert, 10) THEN 'alerte'
    ELSE 'ok'
  END AS statut_stock,
  -- Nombre de fournisseurs actifs
  COALESCE(sp_stock.nb_fournisseurs, 0) AS nb_fournisseurs_actifs
FROM public.products p
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(stock_quantity), 0) AS total
  FROM public.product_stock_locations
  WHERE product_id = p.id AND location_type = 'boutique'
) loc_boutique ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(stock_quantity), 0) AS total
  FROM public.product_stock_locations
  WHERE product_id = p.id AND location_type = 'entrepot'
) loc_entrepot ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(stock_quantity), 0) AS total
  FROM public.product_stock_locations
  WHERE product_id = p.id AND location_type = 'fournisseur'
) loc_fournisseur ON true
LEFT JOIN LATERAL (
  SELECT 
    COALESCE(SUM(sp.stock_quantity), 0) AS total,
    COUNT(*) FILTER (WHERE s.is_active = true) AS nb_fournisseurs
  FROM public.supplier_products sp
  JOIN public.suppliers s ON s.id = sp.supplier_id
  WHERE sp.product_id = p.id AND s.is_active = true
) sp_stock ON true
WHERE p.is_active = true;

-- ============================================
-- 2. Table grilles tarifaires B2B
-- ============================================
CREATE TABLE public.b2b_price_grids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  customer_type TEXT NOT NULL DEFAULT 'entreprise',
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_price_grids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage B2B grids"
ON public.b2b_price_grids FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "B2B grids viewable by authenticated"
ON public.b2b_price_grids FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Liaison client ↔ grille
CREATE TABLE public.b2b_customer_grids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grid_id UUID NOT NULL REFERENCES public.b2b_price_grids(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  notes TEXT,
  UNIQUE(user_id, grid_id)
);

ALTER TABLE public.b2b_customer_grids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer grids"
ON public.b2b_customer_grids FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view their own grids"
ON public.b2b_customer_grids FOR SELECT
USING (auth.uid() = user_id);

-- Exceptions par catégorie dans une grille
CREATE TABLE public.b2b_grid_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grid_id UUID NOT NULL REFERENCES public.b2b_price_grids(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(grid_id, category)
);

ALTER TABLE public.b2b_grid_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage grid categories"
ON public.b2b_grid_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Grid categories viewable by authenticated"
ON public.b2b_grid_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================
-- 3. Fonction pour calculer le prix B2B d'un produit pour un client
-- ============================================
CREATE OR REPLACE FUNCTION public.get_b2b_price(
  p_product_id UUID,
  p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price NUMERIC;
  v_discount NUMERIC := 0;
  v_category TEXT;
  v_cat_discount NUMERIC;
BEGIN
  -- Get product price and category
  SELECT price_ttc, category INTO v_price, v_category
  FROM public.products WHERE id = p_product_id;

  IF v_price IS NULL THEN RETURN NULL; END IF;

  -- Find best discount for this user
  SELECT COALESCE(
    -- Category-specific discount takes priority
    (SELECT gc.discount_percent 
     FROM public.b2b_customer_grids cg
     JOIN public.b2b_grid_categories gc ON gc.grid_id = cg.grid_id AND gc.category = v_category
     WHERE cg.user_id = p_user_id
     LIMIT 1),
    -- Otherwise grid-level discount
    (SELECT g.discount_percent
     FROM public.b2b_customer_grids cg
     JOIN public.b2b_price_grids g ON g.id = cg.grid_id AND g.is_active = true
     WHERE cg.user_id = p_user_id
     ORDER BY g.discount_percent DESC
     LIMIT 1),
    0
  ) INTO v_discount;

  RETURN ROUND(v_price * (1 - v_discount / 100), 2);
END;
$$;

-- Trigger updated_at for b2b_price_grids
CREATE TRIGGER update_b2b_price_grids_updated_at
BEFORE UPDATE ON public.b2b_price_grids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
