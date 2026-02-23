-- Batch update image_url on products table in a single SQL call.
-- Replaces the per-row UPDATE loop in process-enrich-file (25k individual queries → 1 query).

CREATE OR REPLACE FUNCTION public.batch_upsert_product_image_url(
  pairs jsonb  -- [{"id": "uuid", "url": "https://..."}]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  WITH input AS (
    SELECT (elem->>'id')::uuid AS product_id,
           elem->>'url'        AS image_url
    FROM jsonb_array_elements(pairs) AS elem
  )
  UPDATE public.products p
  SET    image_url = i.image_url
  FROM   input i
  WHERE  p.id = i.product_id
    AND  (p.image_url IS NULL OR p.image_url = '');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.batch_upsert_product_image_url(jsonb) TO service_role;
