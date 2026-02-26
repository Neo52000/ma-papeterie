-- Batch rollup recomputation: accepts an array of product IDs
-- and processes them all in a single DB call (no per-product HTTP overhead)
CREATE OR REPLACE FUNCTION public.recompute_product_rollups_batch(p_product_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_processed int := 0;
  v_errors int := 0;
BEGIN
  FOREACH v_id IN ARRAY p_product_ids LOOP
    BEGIN
      PERFORM public.recompute_product_rollups(v_id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'errors', v_errors);
END;
$$;

-- Grant to service_role (used by Edge Functions)
GRANT EXECUTE ON FUNCTION public.recompute_product_rollups_batch(uuid[]) TO service_role;
