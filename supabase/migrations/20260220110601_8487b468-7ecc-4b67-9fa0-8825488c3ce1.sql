
-- RPC admin_recompute_all_rollups : recalcul en batch paginé de tous les produits actifs
CREATE OR REPLACE FUNCTION public.admin_recompute_all_rollups(
  p_limit int DEFAULT 500,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_processed int := 0;
  v_errors int := 0;
  v_total bigint;
BEGIN
  -- Sécurité : admin uniquement
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.products WHERE is_active = true;

  FOR v_id IN
    SELECT id FROM public.products
    WHERE is_active = true
    ORDER BY id
    LIMIT p_limit OFFSET p_offset
  LOOP
    BEGIN
      PERFORM public.recompute_product_rollups(v_id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'errors', v_errors,
    'next_offset', p_offset + p_limit,
    'total', v_total,
    'done', ((p_offset + p_limit) >= v_total)
  );
END;
$$;

-- Accorder l'exécution aux rôles authentifiés (la vérification admin est dans la fonction)
GRANT EXECUTE ON FUNCTION public.admin_recompute_all_rollups(int, int) TO authenticated;
