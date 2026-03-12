-- Allow MRS_PUBLIC_PRODUCTS as a crawl_jobs source
ALTER TABLE public.crawl_jobs DROP CONSTRAINT IF EXISTS crawl_jobs_source_check;
ALTER TABLE public.crawl_jobs ADD CONSTRAINT crawl_jobs_source_check
  CHECK (source IN ('MRS_PUBLIC', 'ALKOR_B2B', 'MRS_PUBLIC_PRODUCTS'));
