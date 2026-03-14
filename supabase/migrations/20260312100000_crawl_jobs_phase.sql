-- Add phase column to crawl_jobs for granular progress tracking
ALTER TABLE public.crawl_jobs
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT NULL;

COMMENT ON COLUMN public.crawl_jobs.phase IS 'Current phase of the crawl: login, discovery, scraping, uploading, pushing, done';
