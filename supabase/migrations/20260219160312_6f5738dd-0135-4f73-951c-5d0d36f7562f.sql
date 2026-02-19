
-- Add cost_price column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric;

-- Create liderpapel_pricing_coefficients table
CREATE TABLE public.liderpapel_pricing_coefficients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family text NOT NULL,
  subfamily text,
  coefficient numeric NOT NULL DEFAULT 2.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liderpapel_pricing_coefficients ENABLE ROW LEVEL SECURITY;

-- RLS policies for admins only
CREATE POLICY "Admins can manage liderpapel coefficients"
  ON public.liderpapel_pricing_coefficients
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_liderpapel_coefficients_updated_at
  BEFORE UPDATE ON public.liderpapel_pricing_coefficients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint on family+subfamily for upsert
CREATE UNIQUE INDEX idx_liderpapel_coeff_family_subfamily 
  ON public.liderpapel_pricing_coefficients (family, COALESCE(subfamily, ''));
