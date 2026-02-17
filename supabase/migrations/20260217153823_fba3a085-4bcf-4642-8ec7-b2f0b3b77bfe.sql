
-- Create categories table with hierarchical structure
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  level text NOT NULL CHECK (level IN ('famille', 'sous_famille', 'categorie', 'sous_categorie')),
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique slug per level
CREATE UNIQUE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_level ON public.categories(level);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by everyone"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create supplier_category_mappings table
CREATE TABLE public.supplier_category_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_category_name text NOT NULL,
  supplier_subcategory_name text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scm_category ON public.supplier_category_mappings(category_id);
CREATE INDEX idx_scm_supplier ON public.supplier_category_mappings(supplier_id);
CREATE UNIQUE INDEX idx_scm_unique ON public.supplier_category_mappings(supplier_id, supplier_category_name, COALESCE(supplier_subcategory_name, ''));

-- Enable RLS
ALTER TABLE public.supplier_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier mappings viewable by admins"
ON public.supplier_category_mappings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage supplier mappings"
ON public.supplier_category_mappings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add family/subfamily columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS family text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subfamily text;

-- Trigger for updated_at on categories
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize categories from existing product data
INSERT INTO public.categories (name, slug, level, sort_order)
SELECT DISTINCT 
  category, 
  lower(regexp_replace(regexp_replace(category, '[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ]', '-', 'g'), '-+', '-', 'g')),
  'categorie',
  ROW_NUMBER() OVER (ORDER BY category)
FROM public.products
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (slug) DO NOTHING;
