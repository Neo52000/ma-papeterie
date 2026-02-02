-- Table pour tracer l'historique des imports fournisseurs
CREATE TABLE public.supplier_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('csv', 'xml', 'json')),
  filename text,
  total_rows int DEFAULT 0,
  success_count int DEFAULT 0,
  error_count int DEFAULT 0,
  unmatched_count int DEFAULT 0,
  imported_by uuid,
  imported_at timestamptz DEFAULT now(),
  errors jsonb DEFAULT '[]'::jsonb
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_supplier_import_logs_supplier_id ON public.supplier_import_logs(supplier_id);
CREATE INDEX idx_supplier_import_logs_imported_at ON public.supplier_import_logs(imported_at DESC);

-- Enable RLS
ALTER TABLE public.supplier_import_logs ENABLE ROW LEVEL SECURITY;

-- Policies - Admins uniquement
CREATE POLICY "Admins can view import logs" 
  ON public.supplier_import_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert import logs" 
  ON public.supplier_import_logs 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update import logs" 
  ON public.supplier_import_logs 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );