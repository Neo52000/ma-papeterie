-- Table pour les règles de pricing automatique
CREATE TABLE public.pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  
  -- Filtres d'application
  category TEXT,
  product_ids UUID[],
  supplier_ids UUID[],
  
  -- Stratégie de pricing
  strategy TEXT NOT NULL CHECK (strategy IN ('margin_target', 'competitor_match', 'competitor_undercut', 'hybrid')),
  
  -- Paramètres de marge
  target_margin_percent NUMERIC,
  min_margin_percent NUMERIC,
  max_margin_percent NUMERIC,
  
  -- Paramètres concurrentiels
  competitor_offset_percent NUMERIC DEFAULT 0,
  competitor_offset_fixed NUMERIC DEFAULT 0,
  min_competitor_count INTEGER DEFAULT 1,
  
  -- Limites de prix
  min_price_ht NUMERIC,
  max_price_ht NUMERIC,
  
  -- Contrôle des changements
  max_price_change_percent NUMERIC DEFAULT 10,
  require_approval BOOLEAN DEFAULT false,
  
  -- Métadonnées
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_applied_at TIMESTAMP WITH TIME ZONE
);

-- Table pour l'historique des ajustements de prix
CREATE TABLE public.price_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  pricing_rule_id UUID REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
  
  old_price_ht NUMERIC NOT NULL,
  new_price_ht NUMERIC NOT NULL,
  price_change_percent NUMERIC NOT NULL,
  
  old_margin_percent NUMERIC,
  new_margin_percent NUMERIC,
  
  competitor_avg_price NUMERIC,
  supplier_price NUMERIC,
  
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID
);

-- Enable RLS
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour pricing_rules
CREATE POLICY "Admins can manage pricing rules"
  ON public.pricing_rules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view pricing rules"
  ON public.pricing_rules
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies pour price_adjustments
CREATE POLICY "Admins can manage price adjustments"
  ON public.price_adjustments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view price adjustments"
  ON public.price_adjustments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour les performances
CREATE INDEX idx_pricing_rules_active ON public.pricing_rules(is_active, priority);
CREATE INDEX idx_pricing_rules_category ON public.pricing_rules(category);
CREATE INDEX idx_price_adjustments_product ON public.price_adjustments(product_id);
CREATE INDEX idx_price_adjustments_status ON public.price_adjustments(status);
CREATE INDEX idx_price_adjustments_created_at ON public.price_adjustments(created_at DESC);