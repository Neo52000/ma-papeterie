
-- Correction: vue sans SECURITY DEFINER (views héritent des droits RLS du querant)
DROP VIEW IF EXISTS public.v_supplier_offer_priority;

CREATE VIEW public.v_supplier_offer_priority AS
SELECT *,
  CASE supplier
    WHEN 'ALKOR'    THEN 1
    WHEN 'COMLANDI' THEN 2
    WHEN 'SOFT'     THEN 3
  END AS priority_rank
FROM public.supplier_offers
WHERE is_active = true;
