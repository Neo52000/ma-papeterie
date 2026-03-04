-- Contrainte UNIQUE sur competitor_product_map (product_id, competitor_id, pack_size)
-- Requise par l'upsert de discover-competitor-urls (onConflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competitor_product_map_product_competitor_pack_unique'
  ) THEN
    ALTER TABLE public.competitor_product_map
      ADD CONSTRAINT competitor_product_map_product_competitor_pack_unique
      UNIQUE (product_id, competitor_id, pack_size);
  END IF;
END $$;
