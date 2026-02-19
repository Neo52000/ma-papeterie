
-- Table pour les relations entre produits (couleur, alternatif, complémentaire)
CREATE TABLE public.product_relations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  related_product_id text NOT NULL,
  relation_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour les recherches
CREATE INDEX idx_product_relations_product_id ON public.product_relations (product_id);
CREATE INDEX idx_product_relations_related ON public.product_relations (related_product_id);

-- Contrainte d'unicité pour éviter les doublons
CREATE UNIQUE INDEX idx_product_relations_unique ON public.product_relations (product_id, related_product_id, relation_type);

-- RLS
ALTER TABLE public.product_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product relations viewable by everyone"
ON public.product_relations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage product relations"
ON public.product_relations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
