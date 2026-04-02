-- Replace partial unique index with non-partial unique index
-- so that ON CONFLICT (ref_softcarrier) works in upserts.
-- NULLs are naturally distinct in PostgreSQL, so this is safe.

DROP INDEX IF EXISTS idx_products_ref_softcarrier;

CREATE UNIQUE INDEX idx_products_ref_softcarrier ON public.products USING btree (ref_softcarrier);
