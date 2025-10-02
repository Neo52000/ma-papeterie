-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  school_type TEXT NOT NULL CHECK (school_type IN ('primaire', 'collège', 'lycée')),
  official_code TEXT UNIQUE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_lists table
CREATE TABLE public.school_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_level TEXT NOT NULL,
  school_year TEXT NOT NULL,
  list_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_list_items table
CREATE TABLE public.school_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.school_lists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  suggested_product_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school_list_templates table
CREATE TABLE public.school_list_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  school_type TEXT NOT NULL CHECK (school_type IN ('primaire', 'collège', 'lycée')),
  class_level TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_list_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools (public read)
CREATE POLICY "Schools are viewable by everyone" 
ON public.schools 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage schools" 
ON public.schools 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for school_lists
CREATE POLICY "School lists are viewable by everyone" 
ON public.school_lists 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Admins can manage all school lists" 
ON public.school_lists 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create school lists" 
ON public.school_lists 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own school lists" 
ON public.school_lists 
FOR UPDATE 
USING (auth.uid() = created_by);

-- RLS Policies for school_list_items
CREATE POLICY "School list items are viewable by everyone" 
ON public.school_list_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.school_lists 
    WHERE id = school_list_items.list_id 
    AND status = 'active'
  )
);

CREATE POLICY "Admins can manage all school list items" 
ON public.school_list_items 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage items of their own lists" 
ON public.school_list_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.school_lists 
    WHERE id = school_list_items.list_id 
    AND created_by = auth.uid()
  )
);

-- RLS Policies for school_list_templates
CREATE POLICY "Public templates are viewable by everyone" 
ON public.school_list_templates 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view their own templates" 
ON public.school_list_templates 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all templates" 
ON public.school_list_templates 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create templates" 
ON public.school_list_templates 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" 
ON public.school_list_templates 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX idx_schools_postal_code ON public.schools(postal_code);
CREATE INDEX idx_schools_city ON public.schools(city);
CREATE INDEX idx_schools_type ON public.schools(school_type);
CREATE INDEX idx_school_lists_school_id ON public.school_lists(school_id);
CREATE INDEX idx_school_lists_year ON public.school_lists(school_year);
CREATE INDEX idx_school_list_items_list_id ON public.school_list_items(list_id);

-- Create trigger for updated_at
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_lists_updated_at
BEFORE UPDATE ON public.school_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_list_templates_updated_at
BEFORE UPDATE ON public.school_list_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();