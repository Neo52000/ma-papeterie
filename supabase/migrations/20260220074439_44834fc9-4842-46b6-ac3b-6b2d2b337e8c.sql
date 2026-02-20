-- Table des lignes de réception de stock
CREATE TABLE IF NOT EXISTS public.stock_reception_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reception_id UUID NOT NULL REFERENCES public.stock_receptions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  purchase_order_item_id UUID REFERENCES public.purchase_order_items(id),
  expected_quantity INTEGER NOT NULL DEFAULT 0,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.stock_reception_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock_reception_items"
ON public.stock_reception_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS sur stock_receptions si pas encore fait
ALTER TABLE public.stock_receptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_receptions' AND policyname = 'Admins can manage stock_receptions'
  ) THEN
    CREATE POLICY "Admins can manage stock_receptions"
    ON public.stock_receptions FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- RLS sur purchase_order_items si pas encore fait
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_items' AND policyname = 'Admins can manage purchase_order_items'
  ) THEN
    CREATE POLICY "Admins can manage purchase_order_items"
    ON public.purchase_order_items FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;

-- Ajouter colonne status à stock_receptions si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_receptions' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.stock_receptions ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
  END IF;
END $$;

-- Ajouter colonne reception_number à stock_receptions si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_receptions' AND column_name = 'reception_number'
  ) THEN
    ALTER TABLE public.stock_receptions ADD COLUMN reception_number TEXT;
  END IF;
END $$;
