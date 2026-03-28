-- ============================================
-- Fix v_stock_virtuel : aligner les location_type avec les valeurs réelles
-- Les données utilisent 'store', 'supplier', 'wholesaler_1', 'wholesaler_2'
-- La vue précédente cherchait 'boutique', 'entrepot', 'fournisseur' (jamais trouvés)
-- ============================================

CREATE OR REPLACE VIEW public.v_stock_virtuel AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.ean,
  p.sku_interne,
  -- Stock propre (champ agrégé du produit)
  COALESCE(p.stock_quantity, 0) AS stock_propre,
  -- Stock emplacements détaillés (aliases conservés pour rétrocompatibilité)
  COALESCE(loc_boutique.total, 0) AS stock_boutique,
  COALESCE(loc_entrepot.total, 0) AS stock_entrepot,
  COALESCE(loc_fournisseur.total, 0) AS stock_fournisseur,
  -- Stock fournisseurs (depuis supplier_products)
  COALESCE(sp_stock.total, 0) AS stock_fournisseurs_distant,
  -- Stock virtuel = stock propre + stock locations + fournisseurs pondéré (50%)
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
  WHERE product_id = p.id AND location_type = 'store'
) loc_boutique ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(stock_quantity), 0) AS total
  FROM public.product_stock_locations
  WHERE product_id = p.id AND location_type IN ('wholesaler_1', 'wholesaler_2')
) loc_entrepot ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(stock_quantity), 0) AS total
  FROM public.product_stock_locations
  WHERE product_id = p.id AND location_type = 'supplier'
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
