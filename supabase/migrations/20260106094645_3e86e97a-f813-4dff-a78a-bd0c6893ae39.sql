-- Table pour les connexions aux marketplaces
CREATE TABLE public.marketplace_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  credentials JSONB,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les ventes agrégées par marketplace
CREATE TABLE public.marketplace_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_name TEXT NOT NULL,
  order_id TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_sku TEXT,
  product_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les logs de synchronisation
CREATE TABLE public.marketplace_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_name TEXT NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  items_synced INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour le mapping des produits sur les marketplaces
CREATE TABLE public.marketplace_product_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace_name TEXT NOT NULL,
  marketplace_sku TEXT,
  marketplace_asin TEXT,
  marketplace_product_id TEXT,
  is_synced BOOLEAN DEFAULT false,
  last_stock_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, marketplace_name)
);

-- Enable RLS
ALTER TABLE public.marketplace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_product_mappings ENABLE ROW LEVEL SECURITY;

-- Policies for admin access only
CREATE POLICY "Admins can manage marketplace connections"
ON public.marketplace_connections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage marketplace sales"
ON public.marketplace_sales
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage sync logs"
ON public.marketplace_sync_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage product mappings"
ON public.marketplace_product_mappings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_marketplace_connections_updated_at
BEFORE UPDATE ON public.marketplace_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_product_mappings_updated_at
BEFORE UPDATE ON public.marketplace_product_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default marketplace connections
INSERT INTO public.marketplace_connections (marketplace_name, is_active) VALUES
('Amazon', false),
('Cdiscount', false),
('eBay', false);