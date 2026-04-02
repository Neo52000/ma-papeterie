-- Add composite index for homepage "Les indispensables du moment" query.
-- Without this index, SELECT ... WHERE is_featured = true ORDER BY created_at DESC
-- does a full table scan on 90K+ products and times out.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_is_featured_created_at
ON products (is_featured, created_at DESC)
WHERE is_featured = true;
