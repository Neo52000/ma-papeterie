
-- Storage bucket for school list uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('school-lists', 'school-lists', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for school-lists bucket
CREATE POLICY "Users can upload their own school lists"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-lists' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own school lists"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-lists' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own school lists"
ON storage.objects FOR DELETE
USING (bucket_id = 'school-lists' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Table: school_list_uploads (tracks each uploaded file + OCR result)
CREATE TABLE public.school_list_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  school_name TEXT,
  class_level TEXT,
  school_year TEXT DEFAULT '2025-2026',
  ocr_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_list_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own uploads"
ON public.school_list_uploads FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads"
ON public.school_list_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads"
ON public.school_list_uploads FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
ON public.school_list_uploads FOR DELETE USING (auth.uid() = user_id);

-- Table: school_list_matches (product matching results per item)
CREATE TABLE public.school_list_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.school_list_uploads(id) ON DELETE CASCADE,
  item_label TEXT NOT NULL,
  item_quantity INTEGER NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  constraints TEXT,
  match_status TEXT NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending', 'matched', 'partial', 'unmatched')),
  confidence NUMERIC(3,2) DEFAULT 0,
  candidates JSONB DEFAULT '[]'::jsonb,
  selected_product_id UUID REFERENCES public.products(id),
  tier TEXT CHECK (tier IN ('essentiel', 'equilibre', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_list_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matches"
ON public.school_list_matches FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.school_list_uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own matches"
ON public.school_list_matches FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.school_list_uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()
));

-- Table: school_list_carts (3 cart variants per upload)
CREATE TABLE public.school_list_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.school_list_uploads(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('essentiel', 'equilibre', 'premium')),
  total_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(10,2) NOT NULL DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(upload_id, tier)
);

ALTER TABLE public.school_list_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own carts"
ON public.school_list_carts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.school_list_uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own carts"
ON public.school_list_carts FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.school_list_uploads u WHERE u.id = upload_id AND u.user_id = auth.uid()
));

-- Trigger for updated_at on school_list_uploads
CREATE TRIGGER update_school_list_uploads_updated_at
BEFORE UPDATE ON public.school_list_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_school_list_matches_upload_id ON public.school_list_matches(upload_id);
CREATE INDEX idx_school_list_carts_upload_id ON public.school_list_carts(upload_id);
CREATE INDEX idx_school_list_uploads_user_id ON public.school_list_uploads(user_id);
