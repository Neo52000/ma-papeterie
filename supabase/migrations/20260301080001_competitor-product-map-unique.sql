-- Contrainte UNIQUE sur competitor_product_map (product_id, competitor_id, pack_size)
-- Requise par l'upsert de discover-competitor-urls (onConflict)
ALTER TABLE public.competitor_product_map
  ADD CONSTRAINT IF NOT EXISTS competitor_product_map_product_competitor_pack_unique
  UNIQUE (product_id, competitor_id, pack_size);
