-- Bucket Supabase Storage pour les fichiers enrichissement Liderpapel (volumineux)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'liderpapel-enrichment',
  'liderpapel-enrichment',
  false,
  524288000,
  ARRAY['application/json', 'text/plain', 'application/octet-stream']
) ON CONFLICT (id) DO NOTHING;

-- RLS : seuls les admins peuvent lire/écrire dans ce bucket
CREATE POLICY "admin_storage_enrich_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'liderpapel-enrichment' AND
    (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

CREATE POLICY "admin_storage_enrich_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'liderpapel-enrichment' AND
    (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

CREATE POLICY "admin_storage_enrich_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'liderpapel-enrichment' AND
    (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  );

-- Table de suivi des jobs d'import enrichissement
CREATE TABLE IF NOT EXISTS public.enrich_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT,
  file_type TEXT, -- 'descriptions_json' | 'multimedia_json' | 'relations_json'
  file_name TEXT,
  status TEXT DEFAULT 'pending', -- pending | uploading | processing | done | error
  processed_rows INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.enrich_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_enrich_jobs" ON public.enrich_import_jobs FOR ALL USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Trigger updated_at
CREATE TRIGGER update_enrich_import_jobs_updated_at
  BEFORE UPDATE ON public.enrich_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();