-- ============================================================================
-- Stamp Models: catalog of stamp bodies available for customization
-- ============================================================================

CREATE TABLE public.stamp_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto-encreur', 'bois', 'dateur', 'cachet-rond', 'numeroteur')),
  slug TEXT UNIQUE NOT NULL,
  width_mm NUMERIC(6,1) NOT NULL,
  height_mm NUMERIC(6,1) NOT NULL,
  max_lines INTEGER NOT NULL DEFAULT 4,
  supports_logo BOOLEAN NOT NULL DEFAULT true,
  base_price_ht NUMERIC(8,2) NOT NULL,
  base_price_ttc NUMERIC(8,2) NOT NULL,
  tva_rate NUMERIC(4,2) NOT NULL DEFAULT 20.00,
  image_url TEXT,
  available_ink_colors JSONB NOT NULL DEFAULT '["noir","bleu","rouge","vert","violet"]'::jsonb,
  available_case_colors JSONB NOT NULL DEFAULT '["noir","bleu","rouge"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER NOT NULL DEFAULT 100,
  display_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stamp_models_active ON public.stamp_models(is_active, display_order);
CREATE INDEX idx_stamp_models_brand ON public.stamp_models(brand);
CREATE INDEX idx_stamp_models_type ON public.stamp_models(type);

ALTER TABLE public.stamp_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stamp_models_public_read" ON public.stamp_models
  FOR SELECT USING (true);

CREATE POLICY "stamp_models_admin_all" ON public.stamp_models
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Seed popular stamp models
INSERT INTO public.stamp_models (name, brand, type, slug, width_mm, height_mm, max_lines, supports_logo, base_price_ht, base_price_ttc, description, display_order) VALUES
  ('Trodat Printy 4911', 'Trodat', 'auto-encreur', 'trodat-printy-4911', 38.0, 14.0, 3, true, 15.83, 19.00, 'Tampon auto-encreur compact, idéal pour 1 à 3 lignes de texte. Format carte de visite.', 1),
  ('Trodat Printy 4912', 'Trodat', 'auto-encreur', 'trodat-printy-4912', 47.0, 18.0, 4, true, 18.33, 22.00, 'Tampon auto-encreur polyvalent, le plus populaire. Parfait pour adresse ou cachet société.', 2),
  ('Trodat Printy 4913', 'Trodat', 'auto-encreur', 'trodat-printy-4913', 58.0, 22.0, 5, true, 22.50, 27.00, 'Grand tampon auto-encreur pour textes détaillés avec logo.', 3),
  ('Trodat Printy 4926', 'Trodat', 'auto-encreur', 'trodat-printy-4926', 75.0, 38.0, 7, true, 29.17, 35.00, 'Très grand tampon pour cachets complets avec logo et mentions légales.', 4),
  ('Trodat Printy 4927', 'Trodat', 'auto-encreur', 'trodat-printy-4927', 60.0, 40.0, 8, true, 33.33, 40.00, 'Format carré idéal pour cachets officiels et grandes compositions.', 5),
  ('Colop Printer 20', 'Colop', 'auto-encreur', 'colop-printer-20', 38.0, 14.0, 3, true, 14.17, 17.00, 'Tampon Colop compact et ergonomique. Impression nette et précise.', 6),
  ('Colop Printer 30', 'Colop', 'auto-encreur', 'colop-printer-30', 47.0, 18.0, 4, true, 17.50, 21.00, 'Tampon Colop format standard, excellent rapport qualité-prix.', 7),
  ('Colop Printer 40', 'Colop', 'auto-encreur', 'colop-printer-40', 59.0, 23.0, 5, true, 21.67, 26.00, 'Grand tampon Colop pour textes complets et logos.', 8),
  ('Colop Printer 50', 'Colop', 'auto-encreur', 'colop-printer-50', 69.0, 30.0, 6, true, 27.50, 33.00, 'Très grand Colop pour cachets détaillés.', 9),
  ('Colop Printer R40', 'Colop', 'cachet-rond', 'colop-printer-r40', 40.0, 40.0, 4, true, 25.00, 30.00, 'Cachet rond diamètre 40mm. Idéal pour associations et professions réglementées.', 10),
  ('Trodat Printy 46040', 'Trodat', 'cachet-rond', 'trodat-printy-46040', 40.0, 40.0, 4, true, 27.50, 33.00, 'Cachet rond Trodat 40mm avec texte circulaire et logo central.', 11),
  ('Trodat Printy Dateur 4820', 'Trodat', 'dateur', 'trodat-printy-dateur-4820', 41.0, 4.0, 1, false, 16.67, 20.00, 'Tampon dateur automatique. Date réglable sur 12 ans.', 12),
  ('Trodat Professional 5460', 'Trodat', 'dateur', 'trodat-professional-5460', 56.0, 33.0, 4, true, 37.50, 45.00, 'Dateur professionnel avec zone de texte personnalisable et date.', 13),
  ('Tampon Bois 40x15', 'Générique', 'bois', 'tampon-bois-40x15', 40.0, 15.0, 3, true, 8.33, 10.00, 'Tampon bois traditionnel avec encreur séparé. Économique et durable.', 14),
  ('Tampon Bois 60x30', 'Générique', 'bois', 'tampon-bois-60x30', 60.0, 30.0, 5, true, 12.50, 15.00, 'Grand tampon bois pour cachets complets. Encrage séparé.', 15);
