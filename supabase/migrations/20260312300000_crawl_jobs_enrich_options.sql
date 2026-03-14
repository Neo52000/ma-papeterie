-- Add enrich_options column to crawl_jobs to store which enrichment types to extract
ALTER TABLE public.crawl_jobs ADD COLUMN IF NOT EXISTS enrich_options TEXT[] DEFAULT ARRAY['images', 'descriptions', 'specs', 'dimensions'];

-- Add enrichment_data column to crawl_pages to store extracted text/specs data
ALTER TABLE public.crawl_pages ADD COLUMN IF NOT EXISTS enrichment_data JSONB;
