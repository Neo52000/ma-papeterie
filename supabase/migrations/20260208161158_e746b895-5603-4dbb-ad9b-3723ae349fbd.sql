
-- =============================================
-- Collecteur d'Images : Tables + RLS + Storage
-- =============================================

-- Table admin_secrets (stockage sécurisé cookie Alkor, accessible uniquement via service_role)
CREATE TABLE public.admin_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- Seuls admin/super_admin peuvent lire/écrire (mais en pratique les edge functions utilisent service_role)
CREATE POLICY "Admins can manage admin_secrets"
  ON public.admin_secrets FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- =============================================
-- crawl_jobs
-- =============================================
CREATE TABLE public.crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('MRS_PUBLIC', 'ALKOR_B2B')),
  start_urls TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'error', 'canceled')),
  max_pages INT NOT NULL DEFAULT 800,
  max_images INT NOT NULL DEFAULT 3000,
  delay_ms INT NOT NULL DEFAULT 150,
  pages_visited INT NOT NULL DEFAULT 0,
  images_found INT NOT NULL DEFAULT 0,
  images_uploaded INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage crawl_jobs"
  ON public.crawl_jobs FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER update_crawl_jobs_updated_at
  BEFORE UPDATE ON public.crawl_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- crawl_pages
-- =============================================
CREATE TABLE public.crawl_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  http_status INT,
  links_found INT DEFAULT 0,
  images_on_page INT DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, page_url)
);

ALTER TABLE public.crawl_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage crawl_pages"
  ON public.crawl_pages FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- =============================================
-- crawl_images
-- =============================================
CREATE TABLE public.crawl_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
  page_url TEXT,
  source_url TEXT NOT NULL,
  storage_path TEXT,
  storage_public_url TEXT,
  content_type TEXT,
  sha256 TEXT,
  bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, source_url)
);

ALTER TABLE public.crawl_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage crawl_images"
  ON public.crawl_images FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- =============================================
-- Storage bucket (privé)
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('image-crawls', 'image-crawls', false);

-- Admins can upload to bucket
CREATE POLICY "Admins can upload to image-crawls"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'image-crawls' AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- Admins can read from bucket
CREATE POLICY "Admins can read image-crawls"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'image-crawls' AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- Admins can delete from bucket
CREATE POLICY "Admins can delete from image-crawls"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'image-crawls' AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

-- Index for performance
CREATE INDEX idx_crawl_images_job_id ON public.crawl_images(job_id);
CREATE INDEX idx_crawl_pages_job_id ON public.crawl_pages(job_id);
CREATE INDEX idx_crawl_jobs_status ON public.crawl_jobs(status);
